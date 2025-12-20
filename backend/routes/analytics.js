const express = require("express")
const router = express.Router()
const Expense = require("../models/Expense")
const Group = require("../models/Group")
const User = require("../models/User")
const { ok, fail } = require("../utils/http")
const { 
  toBaseCurrency, 
  calculateMemberBalance, 
  calculateBalanceMatrix, 
  calculateSettlementSuggestions,
  calculateAgingBuckets,
  calculateSettlementVelocity,
  calculateFairnessMetrics,
  calculateParticipationMetrics
} = require("../utils/analytics-calcs")

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
  const userId = req.user._id || req.user.id
  const baseCurrency = req.user.preferences?.baseCurrency || 'USD'
  
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
    matchQuery.$or = [
      { paidBy: userId },
      { "splits.user": userId }
    ]
  } else if (filters.mode === 'group') {
    matchQuery.groupId = { $exists: true, $ne: null }
    
    // Get user's groups for ACL
    const userGroups = await Group.find({
      "members.user": userId,
      isActive: true
    }).select('_id')
    
    if (filters.groupIds && filters.groupIds.length > 0) {
      // Filter by specific groups and verify membership
      const allowedGroupIds = filters.groupIds.filter(groupId => 
        userGroups.some(g => g._id.toString() === groupId)
      )
      matchQuery.groupId = { $in: allowedGroupIds }
    } else {
      matchQuery.groupId = { $in: userGroups.map(g => g._id) }
    }
    
    matchQuery.$or = [
      { paidBy: userId },
      { "splits.user": userId }
    ]
  } else {
    // 'all' mode - include both personal and group expenses
    matchQuery.$or = [
      { paidBy: userId },
      { "splits.user": userId }
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
    matchQuery.createdBy = { $in: filters.createdBy }
  }
  
  if (filters.paidBy && filters.paidBy.length > 0) {
    matchQuery.paidBy = { $in: filters.paidBy }
  }
  
  return { matchQuery, baseCurrency }
}

/**
 * 1. KPIs endpoint
 */
router.get("/kpis", async (req, res) => {
  try {
    const filters = req.query
    const { matchQuery, baseCurrency } = await buildBaseQuery(req, filters)
    const userId = (req.user._id || req.user.id).toString()
    
    // Get expenses for calculations
    const expenses = await Expense.find(matchQuery)
      .select('amountCents currencyCode fxRate category status date groupId paidBy splits')
      .lean()
    
    // Calculate KPIs
    let totalSpendBaseCents = 0
    let expensesCount = { personal: 0, group: 0 }
    let activeGroups = new Set()
    let activeMembers = new Set()
    
    expenses.forEach(expense => {
      const baseAmount = toBaseCurrency(expense.amountCents, expense.fxRate || 1.0)
      totalSpendBaseCents += baseAmount
      
      if (expense.groupId) {
        expensesCount.group++
        activeGroups.add(expense.groupId.toString())
        activeMembers.add(expense.paidBy.toString())
        expense.splits.forEach(split => activeMembers.add(split.user.toString()))
      } else {
        expensesCount.personal++
        activeMembers.add(expense.paidBy.toString())
      }
    })
    
    // Calculate net balance for current user
    const userExpenses = expenses.filter(e => 
      e.paidBy.toString() === userId || 
      e.splits.some(s => s.user.toString() === userId)
    )
    
    let netBalanceBaseCents = 0
    userExpenses.forEach(expense => {
      const isPayer = expense.paidBy.toString() === userId
      const userSplit = expense.splits.find(s => s.user.toString() === userId)
      
      if (userSplit) {
        const baseAmount = toBaseCurrency(expense.amountCents, expense.fxRate || 1.0)
        const splitBaseAmount = toBaseCurrency(userSplit.amountCents, expense.fxRate || 1.0)
        
        if (isPayer) {
          netBalanceBaseCents += baseAmount - splitBaseAmount
        } else {
          netBalanceBaseCents -= splitBaseAmount
        }
      }
    })
    
    // Calculate average expense size
    const avgExpenseSizeBaseCents = expenses.length > 0 ? 
      Math.round(totalSpendBaseCents / expenses.length) : 0
    
    // Calculate average settlement days
    const settledExpenses = expenses.filter(e => e.status === 'settled' && e.settledAt)
    let avgSettlementDays = 0
    
    if (settledExpenses.length > 0) {
      const totalDays = settledExpenses.reduce((sum, expense) => {
        const days = Math.floor((new Date(expense.settledAt) - new Date(expense.date)) / (1000 * 60 * 60 * 24))
        return sum + days
      }, 0)
      avgSettlementDays = Math.round(totalDays / settledExpenses.length)
    }
    
    return ok(res, {
      totalSpendBaseCents,
      netBalanceBaseCents,
      expensesCount,
      avgExpenseSizeBaseCents,
      activeGroups: activeGroups.size,
      activeMembers: activeMembers.size,
      avgSettlementDays,
      baseCurrency
    })
  } catch (error) {
    
    return fail(res, 'Failed to calculate KPIs', 500)
  }
})

/**
 * 2. Spend over time chart
 */
router.get("/spend-over-time", async (req, res) => {
  try {
    const filters = req.query
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
    
    return fail(res, 'Failed to get spend over time data', 500)
  }
})

/**
 * 3. Category breakdown
 */
router.get("/category-breakdown", async (req, res) => {
  try {
    const filters = req.query
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
    
    return fail(res, 'Failed to get category breakdown', 500)
  }
})

/**
 * 4. Top partners (users/groups)
 */
router.get("/top-partners", async (req, res) => {
  try {
    const filters = req.query
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
    
    return fail(res, 'Failed to get top partners data', 500)
  }
})

/**
 * 5. Balance matrix for group expenses
 */
router.get("/balance-matrix", async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const { groupId } = req.query
    if (!groupId) {
      return fail(res, 'Group ID is required', 400)
    }
    
    // Verify user is member of group
    const group = await Group.findById(groupId)
    if (!group || !group.members.some(m => m.user.toString() === userId)) {
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
    
    return fail(res, 'Failed to get balance matrix', 500)
  }
})

/**
 * 6. Settlement suggestions
 */
router.get("/simplify", async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const { groupId } = req.query
    if (!groupId) {
      return fail(res, 'Group ID is required', 400)
    }
    
    // Verify user is member of group
    const group = await Group.findById(groupId)
    if (!group || !group.members.some(m => m.user.toString() === userId)) {
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
    
    return fail(res, 'Failed to get settlement suggestions', 500)
  }
})

/**
 * 7. Aging buckets for unsettled balances
 */
router.get("/aging", async (req, res) => {
  try {
    const filters = req.query
    const { matchQuery, baseCurrency } = await buildBaseQuery(req, filters)
    
    // Only get unsettled expenses
    matchQuery.status = { $in: ['active'] }
    
    const expenses = await Expense.find(matchQuery)
      .select('amountCents fxRate date status')
      .lean()
    
    const agingBuckets = calculateAgingBuckets(expenses)
    
    return ok(res, {
      data: agingBuckets,
      baseCurrency
    })
  } catch (error) {
    
    return fail(res, 'Failed to get aging data', 500)
  }
})

/**
 * 8. Ledger export
 */
router.get("/ledger", async (req, res) => {
  try {
    const filters = req.query
    const { matchQuery, baseCurrency } = await buildBaseQuery(req, filters)
    
    const { page = 1, limit = 50 } = req.query
    
    const expenses = await Expense.find(matchQuery)
      .populate('paidBy', 'firstName lastName')
      .populate('groupId', 'name')
      .select('description amountCents currencyCode fxRate category date status groupId paidBy splits')
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean()
    
    const total = await Expense.countDocuments(matchQuery)
    
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
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      baseCurrency
    })
  } catch (error) {
    
    return fail(res, 'Failed to get ledger data', 500)
  }
})

/**
 * 9. CSV export
 */
router.get("/export/csv", async (req, res) => {
  try {
    const filters = req.query
    const { matchQuery, baseCurrency } = await buildBaseQuery(req, filters)
    
    const expenses = await Expense.find(matchQuery)
      .populate('paidBy', 'firstName lastName')
      .populate('groupId', 'name')
      .select('description amountCents currencyCode fxRate category date status groupId paidBy splits')
      .sort({ date: -1 })
      .lean()
    
    // Generate CSV
    const csvHeader = 'Date,Description,Amount,Currency,Base Amount,Category,Type,Group,Paid By,Status,Participants\n'
    const csvRows = expenses.map(expense => {
      const amountBaseCents = toBaseCurrency(expense.amountCents, expense.fxRate || 1.0)
      return [
        new Date(expense.date).toISOString().split('T')[0],
        `"${expense.description}"`,
        (expense.amountCents / 100).toFixed(2),
        expense.currencyCode,
        (amountBaseCents / 100).toFixed(2),
        expense.category,
        expense.groupId ? 'group' : 'personal',
        expense.groupId?.name || 'N/A',
        `"${expense.paidBy.firstName} ${expense.paidBy.lastName}"`,
        expense.status,
        expense.splits.length
      ].join(',')
    }).join('\n')
    
    const csv = csvHeader + csvRows
    
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${new Date().toISOString().split('T')[0]}.csv"`)
    res.send(csv)
  } catch (error) {
    
    return fail(res, 'Failed to export CSV', 500)
  }
})

/**
 * 10. Group health metrics (admin)
 */
router.get("/group-health", async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const { groupId } = req.query
    if (!groupId) {
      return fail(res, 'Group ID is required', 400)
    }
    
    // Verify user is member of group
    const group = await Group.findById(groupId)
    if (!group || !group.members.some(m => m.user.toString() === userId)) {
      return fail(res, 'Access denied', 403)
    }
    
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    
    // Active members in last 30/90 days
    const active30d = await Expense.distinct('paidBy', {
      groupId,
      date: { $gte: thirtyDaysAgo },
      status: { $in: ['active', 'settled'] }
    })
    
    const active90d = await Expense.distinct('paidBy', {
      groupId,
      date: { $gte: ninetyDaysAgo },
      status: { $in: ['active', 'settled'] }
    })
    
    // Expenses per week
    const weeklyExpenses = await Expense.countDocuments({
      groupId,
      date: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      status: { $in: ['active', 'settled'] }
    })
    
    // Settlement rate
    const totalExpenses = await Expense.countDocuments({
      groupId,
      status: { $in: ['active', 'settled'] }
    })
    
    const settledExpenses = await Expense.countDocuments({
      groupId,
      status: 'settled'
    })
    
    const settlementRate = totalExpenses > 0 ? 
      Math.round((settledExpenses / totalExpenses) * 100) : 0
    
    // Fast settlements (< 14 days)
    const fastSettlements = await Expense.countDocuments({
      groupId,
      status: 'settled',
      $expr: {
        $lte: [
          { $divide: [{ $subtract: ['$settledAt', '$date'] }, 1000 * 60 * 60 * 24] },
          14
        ]
      }
    })
    
    const fastSettlementRate = settledExpenses > 0 ? 
      Math.round((fastSettlements / settledExpenses) * 100) : 0
    
    return ok(res, {
      activeMembers30d: active30d.length,
      activeMembers90d: active90d.length,
      totalMembers: group.members.length,
      weeklyExpenses,
      settlementRate,
      fastSettlementRate,
      groupName: group.name
    })
  } catch (error) {
    
    return fail(res, 'Failed to get group health metrics', 500)
  }
})

module.exports = router
