const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const Expense = require("../models/Expense")
const Group = require("../models/Group")
const { ok, fail } = require("../utils/http")
const { getPagination, clampInt } = require("../utils/query")
const {
  toBaseCurrency,
  calculateBalanceMatrix,
  calculateSettlementSuggestions,
  calculateAgingBuckets,
} = require("../utils/analytics-calcs")
const { cacheUserResponse } = require("../middleware/cache")
const { measure } = require("../utils/perf")

const MAX_EXPORT_ROWS = Number(process.env.ANALYTICS_EXPORT_MAX_ROWS || 10000)

// --- Validation constants ---
const VALID_MODES = ['personal', 'group', 'all']
const VALID_RANGES = ['ALL_TIME', 'THIS_MONTH', 'LAST_3M', 'YTD', 'CUSTOM']
const VALID_STATUSES = ['active', 'settled', 'disputed', 'deleted']
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Normalise a query-string value that may arrive as a string or array.
 * Returns [] when the raw value is empty/missing.
 */
function toStringArray(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  return String(raw).split(',').map(s => s.trim()).filter(Boolean)
}

function toObjectId(value) {
  if (!value) return null
  if (value instanceof mongoose.Types.ObjectId) return value
  const raw = String(value)
  return mongoose.Types.ObjectId.isValid(raw) ? new mongoose.Types.ObjectId(raw) : null
}

/**
 * Middleware: validate + sanitise analytics query-string filters.
 * Rejects with 400 on invalid values; populates req.analyticsFilters.
 */
function validateAnalyticsFilters(req, res, next) {
  const q = req.query
  const errors = []

  // mode
  const mode = q.mode || 'all'
  if (!VALID_MODES.includes(mode)) {
    errors.push(`Invalid mode "${mode}". Must be one of: ${VALID_MODES.join(', ')}`)
  }

  // time
  let time = {}
  const range = q['time.range'] || q['time[range]'] || (typeof q.time === 'object' ? q.time?.range : undefined)
  if (range) {
    if (!VALID_RANGES.includes(range)) {
      errors.push(`Invalid time.range "${range}". Must be one of: ${VALID_RANGES.join(', ')}`)
    }
    time.range = range
    if (range === 'CUSTOM') {
      const from = q['time.from'] || q['time[from]'] || (typeof q.time === 'object' ? q.time?.from : undefined)
      const to = q['time.to'] || q['time[to]'] || (typeof q.time === 'object' ? q.time?.to : undefined)
      if (!from || !to) {
        errors.push('CUSTOM range requires both time.from and time.to')
      } else {
        if (!ISO_DATE_RE.test(from)) errors.push(`Invalid time.from "${from}". Use YYYY-MM-DD`)
        if (!ISO_DATE_RE.test(to)) errors.push(`Invalid time.to "${to}". Use YYYY-MM-DD`)
        if (from > to) errors.push('time.from must be before time.to')
        time.from = from
        time.to = to
      }
    }
  }

  // array filters
  const categories = toStringArray(q.categories)
  const paymentMethods = toStringArray(q.paymentMethods)
  const currencies = toStringArray(q.currencies)
  const createdBy = toStringArray(q.createdBy)
  const paidBy = toStringArray(q.paidBy)
  const groupIds = toStringArray(q.groupIds)

  // status
  let status = toStringArray(q.status)
  if (status.length === 0) status = ['active', 'settled']
  const badStatuses = status.filter(s => !VALID_STATUSES.includes(s))
  if (badStatuses.length) {
    errors.push(`Invalid status values: ${badStatuses.join(', ')}`)
  }

  if (errors.length) {
    return fail(res, errors.join('; '), 400)
  }

  // Attach sanitised filters to request
  req.analyticsFilters = {
    mode,
    time: Object.keys(time).length ? time : undefined,
    categories,
    paymentMethods,
    currencies,
    createdBy,
    paidBy,
    groupIds,
    status,
    baseCurrency: q.baseCurrency || undefined,
  }
  next()
}

/**
 * Build date range filter based on time parameters
 */
function buildDateFilter(timeConfig) {
  const now = new Date()

  switch (timeConfig.range) {
    case 'ALL_TIME':
      return {}
    case 'THIS_MONTH':
      return {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
    case 'LAST_3M':
      return {
        $gte: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        $lte: now
      }
    case 'YTD':
      return {
        $gte: new Date(now.getFullYear(), 0, 1),
        $lte: now
      }
    case 'CUSTOM':
      if (timeConfig.from && timeConfig.to) {
        return {
          $gte: new Date(timeConfig.from),
          $lte: new Date(timeConfig.to)
        }
      }
      return {}
    default:
      return {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
  }
}

/**
 * Build base match query with ACL enforcement
 */
async function buildBaseQuery(req, filters) {
  const userIdRaw = req.user._id || req.user.id
  const userId = toObjectId(userIdRaw) || userIdRaw
  const baseCurrency = req.user.preferences?.baseCurrency || 'USD'
  const userGroups = await measure("analytics.baseQuery.groups", () =>
    Group.find({
      "members.user": userId,
      isActive: true
    }).select("_id").lean(),
  )
  const userGroupIds = userGroups.map(g => g._id)

  let matchQuery = {
    status: { $in: filters.status || ['active', 'settled'] },
  }
  // Apply date filter only if provided (ALL_TIME or missing -> no date filter)
  if (filters.time && Object.keys(filters.time).length > 0) {
    const dateFilter = buildDateFilter(filters.time)
    if (dateFilter && Object.keys(dateFilter).length > 0) {
      matchQuery.date = dateFilter
    }
  }

  // Handle mode filtering
  if (filters.mode === 'personal') {
    matchQuery.groupId = null
    // Keep parity with dashboard list: personal expenses created by current user.
    matchQuery.paidBy = userId
  } else if (filters.mode === 'group') {
    matchQuery.groupId = { $exists: true, $ne: null }

    if (filters.groupIds && filters.groupIds.length > 0) {
      // Filter by specific groups and verify membership
      const allowedGroupIds = filters.groupIds.filter(groupId =>
        userGroups.some(g => g._id.toString() === groupId)
      )
      matchQuery.groupId = {
        $in: allowedGroupIds
          .map(id => toObjectId(id))
          .filter(Boolean)
      }
    } else {
      matchQuery.groupId = { $in: userGroups.map(g => g._id) }
    }
  } else {
    // 'all' mode parity with dashboard:
    // all active expenses in user's groups + user's personal expenses.
    matchQuery.$or = [
      { groupId: { $in: userGroupIds } },
      { groupId: null, paidBy: userId }
    ]
  }

  // Apply additional filters
  if (filters.categories && filters.categories.length > 0) {
    matchQuery.category = { $in: filters.categories }
  }

  if (filters.paymentMethods && filters.paymentMethods.length > 0) {
    matchQuery.paymentMethod = { $in: filters.paymentMethods }
  }

  if (filters.currencies && filters.currencies.length > 0) {
    matchQuery.currencyCode = { $in: filters.currencies }
  }

  if (filters.createdBy && filters.createdBy.length > 0) {
    const createdByIds = filters.createdBy.map(id => toObjectId(id)).filter(Boolean)
    if (createdByIds.length > 0) {
      matchQuery.createdBy = { $in: createdByIds }
    }
  }

  if (filters.paidBy && filters.paidBy.length > 0) {
    const paidByIds = filters.paidBy.map(id => toObjectId(id)).filter(Boolean)
    if (paidByIds.length > 0) {
      matchQuery.paidBy = { $in: paidByIds }
    }
  }

  return { matchQuery, baseCurrency }
}

/**
 * 1. KPIs endpoint
 */
router.get("/kpis", cacheUserResponse({ namespace: "analytics", ttlSeconds: 120 }), validateAnalyticsFilters, async (req, res) => {
  try {
    const filters = req.analyticsFilters
    const { matchQuery, baseCurrency } = await buildBaseQuery(req, filters)
    const userId = toObjectId(req.user._id || req.user.id) || (req.user._id || req.user.id)

    const [totalsAgg, activeGroups, participantsAgg, userNetAgg, settlementAgg] = await Promise.all([
      Expense.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalSpendBaseCents: {
              $sum: { $multiply: ["$amountCents", { $ifNull: ["$fxRate", 1] }] },
            },
            personalSpendBaseCents: {
              $sum: {
                $cond: [
                  { $eq: ["$groupId", null] },
                  { $multiply: ["$amountCents", { $ifNull: ["$fxRate", 1] }] },
                  0,
                ],
              },
            },
            groupSpendBaseCents: {
              $sum: {
                $cond: [
                  { $ne: ["$groupId", null] },
                  { $multiply: ["$amountCents", { $ifNull: ["$fxRate", 1] }] },
                  0,
                ],
              },
            },
            personalCount: { $sum: { $cond: [{ $eq: ["$groupId", null] }, 1, 0] } },
            groupCount: { $sum: { $cond: [{ $ne: ["$groupId", null] }, 1, 0] } },
            totalCount: { $sum: 1 },
          },
        },
      ]),
      Expense.distinct("groupId", { ...matchQuery, groupId: { $exists: true, $ne: null } }),
      Expense.aggregate([
        { $match: matchQuery },
        {
          $project: {
            participants: { $concatArrays: [["$paidBy"], "$splits.user"] },
          },
        },
        { $unwind: "$participants" },
        { $group: { _id: null, ids: { $addToSet: "$participants" } } },
      ]),
      Expense.aggregate([
        { $match: matchQuery },
        {
          $project: {
            amountBaseCents: { $multiply: ["$amountCents", { $ifNull: ["$fxRate", 1] }] },
            paidBy: 1,
            userSplit: {
              $first: {
                $filter: {
                  input: "$splits",
                  as: "split",
                  cond: { $eq: ["$$split.user", userId] },
                },
              },
            },
            fxRate: { $ifNull: ["$fxRate", 1] },
          },
        },
        {
          $project: {
            netContribution: {
              $cond: [
                { $eq: ["$paidBy", userId] },
                {
                  $subtract: [
                    "$amountBaseCents",
                    { $multiply: [{ $ifNull: ["$userSplit.amountCents", 0] }, "$fxRate"] },
                  ],
                },
                { $multiply: [{ $ifNull: ["$userSplit.amountCents", 0] }, "$fxRate", -1] },
              ],
            },
          },
        },
        { $group: { _id: null, netBalanceBaseCents: { $sum: "$netContribution" } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            ...matchQuery,
            status: "settled",
            settledAt: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgSettlementDays: {
              $avg: {
                $divide: [{ $subtract: ["$settledAt", "$date"] }, 1000 * 60 * 60 * 24],
              },
            },
          },
        },
      ]),
    ])

    const totals = totalsAgg[0] || {}
    const avgExpenseSizeBaseCents =
      totals.totalCount > 0 ? Math.round((totals.totalSpendBaseCents || 0) / totals.totalCount) : 0
    const netBalanceBaseCents = Math.round(userNetAgg[0]?.netBalanceBaseCents || 0)
    const avgSettlementDays = Math.round(settlementAgg[0]?.avgSettlementDays || 0)
    const expensesCount = {
      personal: totals.personalCount || 0,
      group: totals.groupCount || 0,
    }

    return ok(res, {
      totalSpendBaseCents: Math.round(totals.totalSpendBaseCents || 0),
      personalSpendBaseCents: Math.round(totals.personalSpendBaseCents || 0),
      groupSpendBaseCents: Math.round(totals.groupSpendBaseCents || 0),
      netBalanceBaseCents,
      expensesCount,
      avgExpenseSizeBaseCents,
      activeGroups: activeGroups.length,
      activeMembers: participantsAgg[0]?.ids?.length || 0,
      avgSettlementDays,
      baseCurrency
    })
  } catch (error) {
    console.error('[Analytics] KPIs error:', error.message)
    return fail(res, 'Failed to calculate KPIs', 500)
  }
})

/**
 * 2. Spend over time chart
 */
router.get("/spend-over-time", cacheUserResponse({ namespace: "analytics", ttlSeconds: 120 }), validateAnalyticsFilters, async (req, res) => {
  try {
    const filters = req.analyticsFilters
    const { matchQuery, baseCurrency } = await buildBaseQuery(req, filters)

    const aggregation = [
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            isGroup: { $cond: [{ $eq: ["$groupId", null] }, false, true] }
          },
          totalCents: { $sum: "$amountCents" },
          totalBaseCents: { $sum: { $multiply: ["$amountCents", { $ifNull: ["$fxRate", 1] }] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]

    const results = await Expense.aggregate(aggregation)

    // Group by date and separate personal vs group
    const spendOverTime = {}
    results.forEach(result => {
      const date = result._id.date
      const isGroup = result._id.isGroup

      if (!spendOverTime[date]) {
        spendOverTime[date] = {
          date,
          personal: { amountCents: 0, baseCents: 0, count: 0 },
          group: { amountCents: 0, baseCents: 0, count: 0 }
        }
      }

      if (isGroup) {
        spendOverTime[date].group.amountCents += result.totalCents
        spendOverTime[date].group.baseCents += result.totalBaseCents
        spendOverTime[date].group.count += result.count
      } else {
        spendOverTime[date].personal.amountCents += result.totalCents
        spendOverTime[date].personal.baseCents += result.totalBaseCents
        spendOverTime[date].personal.count += result.count
      }
    })

    return ok(res, {
      data: Object.values(spendOverTime),
      baseCurrency
    })
  } catch (error) {
    console.error('[Analytics] spend-over-time error:', error.message)
    return fail(res, 'Failed to get spend over time data', 500)
  }
})

/**
 * 3. Category breakdown
 */
router.get("/category-breakdown", cacheUserResponse({ namespace: "analytics", ttlSeconds: 120 }), validateAnalyticsFilters, async (req, res) => {
  try {
    const filters = req.analyticsFilters
    const { matchQuery, baseCurrency } = await buildBaseQuery(req, filters)

    const aggregation = [
      { $match: matchQuery },
      {
        $group: {
          _id: "$category",
          totalCents: { $sum: "$amountCents" },
          totalBaseCents: { $sum: { $multiply: ["$amountCents", { $ifNull: ["$fxRate", 1] }] } },
          count: { $sum: 1 },
          personal: {
            $sum: { $cond: [{ $eq: ["$groupId", null] }, 1, 0] }
          },
          group: {
            $sum: { $cond: [{ $ne: ["$groupId", null] }, 1, 0] }
          }
        }
      },
      { $sort: { totalBaseCents: -1 } }
    ]

    const results = await Expense.aggregate(aggregation)

    return ok(res, {
      data: results,
      baseCurrency
    })
  } catch (error) {
    console.error('[Analytics] category-breakdown error:', error.message)
    return fail(res, 'Failed to get category breakdown', 500)
  }
})

/**
 * 4. Top partners (users/groups)
 */
router.get("/top-partners", cacheUserResponse({ namespace: "analytics", ttlSeconds: 120 }), validateAnalyticsFilters, async (req, res) => {
  try {
    const filters = req.analyticsFilters
    const { matchQuery, baseCurrency } = await buildBaseQuery(req, filters)

    // Top users
    const topUsers = await Expense.aggregate([
      { $match: { ...matchQuery, groupId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$paidBy",
          totalCents: { $sum: "$amountCents" },
          totalBaseCents: { $sum: { $multiply: ["$amountCents", { $ifNull: ["$fxRate", 1] }] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalBaseCents: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          totalCents: 1,
          totalBaseCents: 1,
          count: 1,
          name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          avatar: "$user.avatar"
        }
      }
    ])

    // Top groups
    const topGroups = await Expense.aggregate([
      { $match: { ...matchQuery, groupId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$groupId",
          totalCents: { $sum: "$amountCents" },
          totalBaseCents: { $sum: { $multiply: ["$amountCents", { $ifNull: ["$fxRate", 1] }] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalBaseCents: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "groups",
          localField: "_id",
          foreignField: "_id",
          as: "group"
        }
      },
      { $unwind: "$group" },
      {
        $project: {
          _id: 1,
          totalCents: 1,
          totalBaseCents: 1,
          count: 1,
          name: "$group.name",
          memberCount: { $size: "$group.members" }
        }
      }
    ])

    return ok(res, {
      topUsers,
      topGroups,
      baseCurrency
    })
  } catch (error) {
    console.error('[Analytics] top-partners error:', error.message)
    return fail(res, 'Failed to get top partners data', 500)
  }
})

/**
 * 5. Balance matrix for group expenses
 */
router.get("/balance-matrix", cacheUserResponse({ namespace: "analytics", ttlSeconds: 90 }), async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const { groupId } = req.query
    if (!groupId) {
      return fail(res, 'Group ID is required', 400)
    }

    // Verify user is member of group
    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
      isActive: true,
    }).select("name members.user").lean()
    if (!group) {
      return fail(res, 'Access denied', 403)
    }

    const expenses = await Expense.find({
      groupId,
      status: { $in: ['active', 'settled'] }
    }).select('amountCents fxRate paidBy splits').lean()

    const memberIds = group.members.map(m => m.user.toString())
    const balanceMatrix = calculateBalanceMatrix(expenses, memberIds)

    return ok(res, {
      balanceMatrix,
      memberIds,
      groupName: group.name
    })
  } catch (error) {
    console.error('[Analytics] balance-matrix error:', error.message)
    return fail(res, 'Failed to get balance matrix', 500)
  }
})

/**
 * 6. Settlement suggestions
 */
router.get("/simplify", cacheUserResponse({ namespace: "analytics", ttlSeconds: 90 }), async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const { groupId } = req.query
    if (!groupId) {
      return fail(res, 'Group ID is required', 400)
    }

    // Verify user is member of group
    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
      isActive: true,
    }).select("name members.user").lean()
    if (!group) {
      return fail(res, 'Access denied', 403)
    }

    const expenses = await Expense.find({
      groupId,
      status: { $in: ['active', 'settled'] }
    }).select('amountCents fxRate paidBy splits').lean()

    const memberIds = group.members.map(m => m.user.toString())
    const balanceMatrix = calculateBalanceMatrix(expenses, memberIds)
    const suggestions = calculateSettlementSuggestions(balanceMatrix)

    return ok(res, {
      suggestions,
      groupName: group.name
    })
  } catch (error) {
    console.error('[Analytics] simplify error:', error.message)
    return fail(res, 'Failed to get settlement suggestions', 500)
  }
})

/**
 * 7. Aging buckets for unsettled balances
 */
router.get("/aging", cacheUserResponse({ namespace: "analytics", ttlSeconds: 120 }), validateAnalyticsFilters, async (req, res) => {
  try {
    const filters = req.analyticsFilters
    const { matchQuery, baseCurrency } = await buildBaseQuery(req, filters)

    // Only get unsettled expenses
    matchQuery.status = { $in: ['active'] }

    const expenses = await Expense.find(matchQuery)
      .select('amountCents fxRate date status')
      .lean()

    // Normalize to base currency before bucketing so aging totals are comparable.
    const baseCurrencyExpenses = expenses.map(expense => ({
      ...expense,
      amountCents: toBaseCurrency(expense.amountCents || 0, expense.fxRate || 1.0),
    }))

    const agingBuckets = calculateAgingBuckets(baseCurrencyExpenses)

    return ok(res, {
      data: agingBuckets,
      baseCurrency
    })
  } catch (error) {
    console.error('[Analytics] aging error:', error.message)
    return fail(res, 'Failed to get aging data', 500)
  }
})

/**
 * 8. Ledger export
 */
router.get("/ledger", cacheUserResponse({ namespace: "analytics", ttlSeconds: 90 }), validateAnalyticsFilters, async (req, res) => {
  try {
    const filters = req.analyticsFilters
    const { matchQuery, baseCurrency } = await buildBaseQuery(req, filters)
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 200 })

    const [expenses, total] = await Promise.all([
      Expense.find(matchQuery)
        .populate('paidBy', 'firstName lastName')
        .populate('groupId', 'name')
        .select('description amountCents currencyCode fxRate category date status groupId paidBy splits')
        .sort({ date: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Expense.countDocuments(matchQuery),
    ])

    const ledger = expenses.map(expense => ({
      id: expense._id,
      description: expense.description,
      amountCents: expense.amountCents,
      amountBaseCents: toBaseCurrency(expense.amountCents, expense.fxRate || 1.0),
      currency: expense.currencyCode,
      category: expense.category,
      date: expense.date,
      status: expense.status,
      type: expense.groupId ? 'group' : 'personal',
      groupName: expense.groupId?.name || null,
      paidBy: `${expense.paidBy.firstName} ${expense.paidBy.lastName}`,
      participantCount: expense.splits.length,
      isSettled: expense.status === 'settled'
    }))

    return ok(res, {
      data: ledger,
      pagination: {
        page: Number(page),
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      baseCurrency
    })
  } catch (error) {
    console.error('[Analytics] ledger error:', error.message)
    return fail(res, 'Failed to get ledger data', 500)
  }
})

/**
 * 9. CSV export
 */
router.get("/export/csv", validateAnalyticsFilters, async (req, res) => {
  try {
    const filters = req.analyticsFilters
    const { matchQuery } = await buildBaseQuery(req, filters)
    const exportLimit = clampInt(req.query.limit, { min: 1, max: MAX_EXPORT_ROWS, fallback: MAX_EXPORT_ROWS })

    const pipeline = [
      { $match: matchQuery },
      { $sort: { date: -1 } },
      { $limit: exportLimit },
      {
        $lookup: {
          from: "users",
          localField: "paidBy",
          foreignField: "_id",
          as: "paidByUser",
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "groupId",
          foreignField: "_id",
          as: "group",
        },
      },
      {
        $project: {
          description: 1,
          amountCents: 1,
          currencyCode: 1,
          category: 1,
          date: 1,
          status: 1,
          splitsCount: { $size: "$splits" },
          type: { $cond: [{ $eq: ["$groupId", null] }, "personal", "group"] },
          groupName: { $ifNull: [{ $first: "$group.name" }, "N/A"] },
          paidByName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: [{ $first: "$paidByUser.firstName" }, ""] },
                  " ",
                  { $ifNull: [{ $first: "$paidByUser.lastName" }, ""] },
                ],
              },
            },
          },
          amountBaseCents: { $multiply: ["$amountCents", { $ifNull: ["$fxRate", 1] }] },
        },
      },
    ]

    const cursor = Expense.aggregate(pipeline).cursor({ batchSize: 250 }).exec()
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${new Date().toISOString().split('T')[0]}.csv"`)
    res.write('Date,Description,Amount,Currency,Base Amount,Category,Type,Group,Paid By,Status,Participants\n')

    for await (const expense of cursor) {
      const description = String(expense.description || "").replace(/"/g, '""')
      const paidByName = String(expense.paidByName || "").replace(/"/g, '""')
      const row = [
        new Date(expense.date).toISOString().split('T')[0],
        `"${description}"`,
        (Number(expense.amountCents || 0) / 100).toFixed(2),
        expense.currencyCode || "USD",
        (Number(expense.amountBaseCents || 0) / 100).toFixed(2),
        expense.category || "other",
        expense.type,
        expense.groupName || "N/A",
        `"${paidByName}"`,
        expense.status || "active",
        expense.splitsCount || 0,
      ].join(",")
      res.write(`${row}\n`)
    }
    return res.end()
  } catch (error) {
    console.error('[Analytics] CSV export error:', error.message)
    return fail(res, 'Failed to export CSV', 500)
  }
})

/**
 * 10. Group health metrics (admin)
 */
router.get("/group-health", cacheUserResponse({ namespace: "analytics", ttlSeconds: 90 }), async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const { groupId } = req.query
    if (!groupId) {
      return fail(res, 'Group ID is required', 400)
    }

    // Verify user is member of group
    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
      isActive: true,
    }).select("name members.user").lean()
    if (!group) {
      return fail(res, 'Access denied', 403)
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const [activityAgg, settlementAgg] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            groupId: toObjectId(groupId) || groupId,
            status: { $in: ["active", "settled"] },
          },
        },
        {
          $group: {
            _id: null,
            active30dUsers: {
              $addToSet: {
                $cond: [{ $gte: ["$date", thirtyDaysAgo] }, "$paidBy", "$$REMOVE"],
              },
            },
            active90dUsers: {
              $addToSet: {
                $cond: [{ $gte: ["$date", ninetyDaysAgo] }, "$paidBy", "$$REMOVE"],
              },
            },
            weeklyExpenses: {
              $sum: {
                $cond: [{ $gte: ["$date", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)] }, 1, 0],
              },
            },
            totalExpenses: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            groupId: toObjectId(groupId) || groupId,
            status: "settled",
            settledAt: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            settledExpenses: { $sum: 1 },
            fastSettlements: {
              $sum: {
                $cond: [
                  {
                    $lte: [
                      { $divide: [{ $subtract: ["$settledAt", "$date"] }, 1000 * 60 * 60 * 24] },
                      14,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ])

    const activity = activityAgg[0] || {}
    const settlement = settlementAgg[0] || {}
    const totalExpenses = Number(activity.totalExpenses || 0)
    const settledExpenses = Number(settlement.settledExpenses || 0)
    const settlementRate = totalExpenses > 0 ? Math.round((settledExpenses / totalExpenses) * 100) : 0
    const fastSettlementRate = settledExpenses > 0
      ? Math.round((Number(settlement.fastSettlements || 0) / settledExpenses) * 100)
      : 0

    return ok(res, {
      activeMembers30d: activity.active30dUsers?.length || 0,
      activeMembers90d: activity.active90dUsers?.length || 0,
      totalMembers: group.members.length,
      weeklyExpenses: Number(activity.weeklyExpenses || 0),
      settlementRate,
      fastSettlementRate,
      groupName: group.name
    })
  } catch (error) {
    console.error('[Analytics] group-health error:', error.message)
    return fail(res, 'Failed to get group health metrics', 500)
  }
})

module.exports = router
module.exports.validateAnalyticsFilters = validateAnalyticsFilters
