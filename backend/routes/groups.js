const express = require("express")
const Group = require("../models/Group")
const User = require("../models/User")
const Expense = require("../models/Expense")
const Settlement = require("../models/Settlement")
const LedgerEvent = require("../models/LedgerEvent")
const { body, validationResult } = require("express-validator")
const { ok, fail } = require("../utils/http")
const { getPagination } = require("../utils/query")
const { cacheUserResponse } = require("../middleware/cache")
const { bumpUsersCacheVersion } = require("../services/cacheService")
const notificationService = require("../services/notificationService")
const { logAuditEvent } = require("../services/auditService")
const { appendLedgerEvent } = require("../services/ledgerService")

const router = express.Router()

async function invalidateGroupCaches({ req, group = null, groupId = null, extraUserIds = [] }) {
  const userIds = new Set([String(req.user._id), ...extraUserIds.map(String)])
  const resolvedGroupId = group?._id || groupId
  if (resolvedGroupId) {
    let targetGroup = group
    if (!targetGroup) {
      targetGroup = await Group.findById(resolvedGroupId).select("members.user").lean()
    }
    for (const member of targetGroup?.members || []) {
      if (member?.user) userIds.add(String(member.user))
    }
  }
  await bumpUsersCacheVersion(Array.from(userIds))
}

async function buildGroupNetBalances(groupId) {
  const [expenseEdges, settlementEdges, expenseSummary] = await Promise.all([
    Expense.aggregate([
      { $match: { groupId, status: "active" } },
      { $unwind: "$splits" },
      {
        $project: {
          fromUserId: "$splits.user",
          toUserId: "$paidBy",
          amountCents: {
            $cond: [
              { $eq: ["$splits.settled", true] },
              0,
              { $ifNull: ["$splits.amountCents", 0] },
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $gt: ["$amountCents", 0] },
              { $ne: ["$fromUserId", "$toUserId"] },
            ],
          },
        },
      },
      {
        $group: {
          _id: { fromUserId: "$fromUserId", toUserId: "$toUserId" },
          amountCents: { $sum: "$amountCents" },
        },
      },
    ]),
    Settlement.aggregate([
      { $match: { groupId, status: "CONFIRMED" } },
      {
        $group: {
          _id: { fromUserId: "$fromUserId", toUserId: "$toUserId" },
          amountCents: { $sum: "$amountCents" },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { groupId, status: "active" } },
      { $group: { _id: null, totalExpensesCents: { $sum: "$amountCents" }, expenseCount: { $sum: 1 } } },
    ]),
  ])

  const netByUser = new Map()
  const bump = (userId, delta) => {
    const key = String(userId)
    netByUser.set(key, (netByUser.get(key) || 0) + delta)
  }

  for (const edge of expenseEdges) {
    bump(edge._id.toUserId, edge.amountCents)
    bump(edge._id.fromUserId, -edge.amountCents)
  }

  for (const edge of settlementEdges) {
    // Confirmed settlement: fromUser paid toUser, so reduce original debt relation.
    bump(edge._id.fromUserId, edge.amountCents)
    bump(edge._id.toUserId, -edge.amountCents)
  }

  return {
    netByUser,
    totalExpensesCents: expenseSummary[0]?.totalExpensesCents || 0,
    expenseCount: expenseSummary[0]?.expenseCount || 0,
  }
}

function computeGreedyTransactions(netByUser) {
  const creditors = []
  const debtors = []
  for (const [userId, netCents] of netByUser.entries()) {
    const rounded = Math.round(netCents)
    if (rounded > 0) creditors.push({ userId, netCents: rounded })
    if (rounded < 0) debtors.push({ userId, netCents: rounded })
  }

  creditors.sort((a, b) => b.netCents - a.netCents)
  debtors.sort((a, b) => a.netCents - b.netCents)

  const transactions = []
  let i = 0
  let j = 0
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]
    const debtor = debtors[j]
    const amountCents = Math.min(creditor.netCents, Math.abs(debtor.netCents))
    if (amountCents > 0) {
      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amountCents,
        amount: amountCents / 100,
      })
    }
    creditor.netCents -= amountCents
    debtor.netCents += amountCents
    if (creditor.netCents === 0) i += 1
    if (debtor.netCents === 0) j += 1
  }
  return transactions
}

function formatActivityMessage(event, actorName) {
  const amount = Number(event?.payload?.amountCents || 0) / 100
  const description = event?.payload?.description || ""
  switch (event.eventType) {
    case "EXPENSE_CREATED":
      return `${actorName} added an expense${description ? `: ${description}` : ""}${amount > 0 ? ` (${amount.toFixed(2)})` : ""}.`
    case "EXPENSE_UPDATED":
      return `${actorName} updated an expense${amount > 0 ? ` to ${amount.toFixed(2)}` : ""}.`
    case "EXPENSE_DELETED":
      return `${actorName} deleted an expense.`
    case "EXPENSE_COMMENT_ADDED":
      return `${actorName} commented on an expense${event?.payload?.snippet ? `: "${event.payload.snippet}"` : ""}.`
    case "SETTLEMENT_PLANNED":
      return `${actorName} requested settlements${amount > 0 ? ` (${amount.toFixed(2)})` : ""}.`
    case "SETTLEMENT_CONFIRMED":
      return `${actorName} recorded a settlement${amount > 0 ? ` (${amount.toFixed(2)})` : ""}.`
    default:
      return `${actorName} updated group activity.`
  }
}

// Aggregate balance for the current user across all groups (for dashboard)
router.get("/my-balance", cacheUserResponse({ namespace: "groups", ttlSeconds: 60 }), async (req, res) => {
  try {
    const currentUserId = String(req.user._id)
    const groups = await Group.find({
      "members.user": req.user._id,
      isActive: true,
    }).select("_id").lean()

    const groupIds = groups.map((g) => g._id)
    if (groupIds.length === 0) {
      return ok(res, { youOwe: 0, youreOwed: 0, totalBalance: 0 })
    }

    const [expenseEdges, settlementEdges] = await Promise.all([
      Expense.aggregate([
        { $match: { groupId: { $in: groupIds }, status: "active" } },
        { $unwind: "$splits" },
        {
          $project: {
            fromUserId: "$splits.user",
            toUserId: "$paidBy",
            amountCents: {
              $cond: [
                { $eq: ["$splits.settled", true] },
                0,
                { $ifNull: ["$splits.amountCents", 0] },
              ],
            },
          },
        },
        {
          $match: {
            $expr: {
              $and: [
                { $gt: ["$amountCents", 0] },
                { $ne: ["$fromUserId", "$toUserId"] },
              ],
            },
          },
        },
        {
          $group: {
            _id: { fromUserId: "$fromUserId", toUserId: "$toUserId" },
            amountCents: { $sum: "$amountCents" },
          },
        },
      ]),
      Settlement.aggregate([
        { $match: { groupId: { $in: groupIds }, status: "CONFIRMED" } },
        {
          $group: {
            _id: { fromUserId: "$fromUserId", toUserId: "$toUserId" },
            amountCents: { $sum: "$amountCents" },
          },
        },
      ]),
    ])

    const netByCounterparty = new Map()
    const bumpPair = (counterpartyId, deltaCents) => {
      const key = String(counterpartyId)
      netByCounterparty.set(key, (netByCounterparty.get(key) || 0) + deltaCents)
    }

    for (const edge of expenseEdges) {
      const fromId = String(edge?._id?.fromUserId || "")
      const toId = String(edge?._id?.toUserId || "")
      const cents = Math.round(Number(edge?.amountCents || 0))
      if (cents <= 0) continue

      if (toId === currentUserId && fromId !== currentUserId) bumpPair(fromId, cents)
      if (fromId === currentUserId && toId !== currentUserId) bumpPair(toId, -cents)
    }

    for (const edge of settlementEdges) {
      const fromId = String(edge?._id?.fromUserId || "")
      const toId = String(edge?._id?.toUserId || "")
      const cents = Math.round(Number(edge?.amountCents || 0))
      if (cents <= 0) continue

      if (fromId === currentUserId && toId !== currentUserId) bumpPair(toId, cents)
      if (toId === currentUserId && fromId !== currentUserId) bumpPair(fromId, -cents)
    }

    let youreOwed = 0
    let youOwe = 0
    for (const v of netByCounterparty.values()) {
      if (v > 0) youreOwed += v
      if (v < 0) youOwe += Math.abs(v)
    }

    return ok(res, { youOwe, youreOwed, totalBalance: youreOwed - youOwe })
  } catch (error) {
    return fail(res, error.message || "Server error", 500)
  }
})

// Return friends eligible to be added to this group (not already members)
router.get("/:id/friends-eligible", cacheUserResponse({ namespace: "groups", ttlSeconds: 60 }), async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, "members.user": req.user._id, isActive: true })
      .populate("members.user", "_id")
    if (!group) return res.status(404).json({ message: "Group not found" })

    const me = await User.findById(req.user._id).select("friends").populate("friends", "firstName lastName username avatar")
    const memberIds = new Set(group.members.map((m) => m.user.toString()))
    const eligible = (me.friends || []).filter((u) => !memberIds.has(u._id.toString()))
    res.json({ data: eligible })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// Add members (admin only)
router.post("/:id/members", async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, isActive: true })
    if (!group) return res.status(404).json({ message: "Group not found" })
    const me = group.members.find((m) => m.user.toString() === req.user._id.toString())
    if (!me || me.role !== "admin") return res.status(403).json({ message: "Only admins can add members" })

    const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : []
    const toAdd = userIds.filter((id) => !group.members.some((m) => m.user.toString() === id))
    toAdd.forEach((id) => group.members.push({ user: id, role: "member", joinedAt: new Date() }))
    await group.save()

    // Upsert or update the group's conversation participants
    const Conversation = require("../models/Conversation")
    const participantIds = group.members.map((m) => m.user)
    let conv = await Conversation.findOne({ type: "group", groupId: group._id })
    if (!conv) {
      conv = await Conversation.create({ type: "group", groupId: group._id, participants: participantIds })
    } else {
      conv.participants = participantIds
      await conv.save()
    }

    // emit socket event
    req.io.to(`group_${group._id}`).emit("group:membersAdded", { groupId: String(group._id), userIds: toAdd })
    await invalidateGroupCaches({ req, group, extraUserIds: toAdd })
    res.json({ data: { added: toAdd.length } })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// Get all user's groups
router.get("/", cacheUserResponse({ namespace: "groups", ttlSeconds: 60 }), async (req, res) => {
  try {
    const groups = await Group.find({
      "members.user": req.user._id,
      isActive: true,
    })
      .select('name description members createdBy category createdAt updatedAt isActive')
      .populate({ path: 'members.user', select: 'firstName lastName username avatar' })
      .populate({ path: 'createdBy', select: 'firstName lastName username' })
      .sort({ updatedAt: -1 })
      .lean()

    res.json({ data: groups })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get single group
router.get("/:id", cacheUserResponse({ namespace: "groups", ttlSeconds: 60 }), async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
      isActive: true,
    })
      .select('name description members createdBy category settings isActive')
      .populate({ path: 'members.user', select: 'firstName lastName username avatar' })
      .populate({ path: 'createdBy', select: 'firstName lastName username' })
      .lean()

    if (!group) {
      return res.status(404).json({ message: "Group not found" })
    }

    res.json(group)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.get("/:id/activity", cacheUserResponse({ namespace: "groups", ttlSeconds: 30 }), async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
      isActive: true,
    }).select("_id")

    if (!group) return fail(res, "Group not found", 404)

    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 })
    const [events, total] = await Promise.all([
      LedgerEvent.find({ groupId: group._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("actorUserId", "firstName lastName username avatar")
        .lean(),
      LedgerEvent.countDocuments({ groupId: group._id }),
    ])

    const activities = events.map((event) => {
      const actor = event.actorUserId || null
      const actorName = actor?.firstName ? `${actor.firstName} ${actor.lastName || ""}`.trim() : "Someone"
      return {
        id: event._id,
        type: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        groupId: event.groupId,
        actor,
        message: formatActivityMessage(event, actorName),
        payload: event.payload || {},
        createdAt: event.createdAt,
      }
    })

    return ok(res, {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return fail(res, "Failed to load activity", 500)
  }
})

// Create group
router.post(
  "/",
  [
    body("name").notEmpty().trim().isLength({ max: 100 }),
    body("description").optional().trim().isLength({ max: 500 }),
    body("category").optional().isIn(["travel", "food", "home", "entertainment", "utilities", "other"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { name, description, category } = req.body

      const group = new Group({
        name,
        description,
        category,
        createdBy: req.user._id,
        members: [
          {
            user: req.user._id,
            role: "admin",
            joinedAt: new Date(),
          },
        ],
      })

      await group.save()
      await group.populate("members.user", "firstName lastName username avatar")
      await group.populate("createdBy", "firstName lastName username")

      // Emit to user's socket
      req.io.to(`user_${req.user._id}`).emit("group_created", group)

      await logAuditEvent({
        req,
        action: "GROUP_CREATED",
        entityType: "group",
        entityId: group._id,
        groupId: group._id,
        statusCode: 201,
        metadata: { memberCount: group.members?.length || 0 },
      })

      await invalidateGroupCaches({ req, group })
      res.status(201).json(group)
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message })
    }
  },
)

// Update group
router.put(
  "/:id",
  [
    body("name").optional().notEmpty().trim().isLength({ max: 100 }),
    body("description").optional().trim().isLength({ max: 500 }),

  ],
  async (req, res) => {
    try {
      const group = await Group.findOne({
        _id: req.params.id,
        "members.user": req.user._id,
        isActive: true,
      })

      if (!group) {
        return res.status(404).json({ message: "Group not found" })
      }

      // Check if user is admin
      const userMember = group.members.find((member) => member.user.toString() === req.user._id.toString())

      if (userMember.role !== "admin") {
        return res.status(403).json({ message: "Only group admins can update group details" })
      }

      const { name, description, category, settings } = req.body

      if (name) group.name = name
      if (description !== undefined) group.description = description
      if (category) group.category = category
      if (settings) group.settings = { ...group.settings, ...settings }

      await group.save()
      await group.populate("members.user", "firstName lastName username avatar")

      // Emit to group members
      req.io.to(`group_${group._id}`).emit("group_updated", group)

      await invalidateGroupCaches({ req, group })
      res.json(group)
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message })
    }
  },
)

// Join group by invite code
router.post("/join", [body("inviteCode").notEmpty().trim()], async (req, res) => {
  try {
    const { inviteCode } = req.body

    const group = await Group.findOne({
      inviteCode: inviteCode.toUpperCase(),
      isActive: true,
    })

    if (!group) {
      return res.status(404).json({ message: "Invalid invite code" })
    }

    // Check if user is already a member
    const existingMember = group.members.find((member) => member.user.toString() === req.user._id.toString())

    if (existingMember) {
      return res.status(400).json({ message: "You are already a member of this group" })
    }

    // Add user to group
    group.members.push({
      user: req.user._id,
      role: "member",
      joinedAt: new Date(),
    })

    await group.save()
    await group.populate("members.user", "firstName lastName username avatar")

    // Upsert or update the group's conversation participants
    const Conversation = require("../models/Conversation")
    const participantIds = group.members.map((m) => m.user)
    let conv = await Conversation.findOne({ type: "group", groupId: group._id })
    if (!conv) {
      conv = await Conversation.create({ type: "group", groupId: group._id, participants: participantIds })
    } else {
      conv.participants = participantIds
      await conv.save()
    }

    // Emit to group members
    req.io.to(`group_${group._id}`).emit("member_joined", {
      group: group,
      newMember: req.user,
    })

    await invalidateGroupCaches({ req, group })
    res.json(group)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get group balance summary
router.get("/:id/balances", cacheUserResponse({ namespace: "groups", ttlSeconds: 45 }), async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
      isActive: true,
    }).populate("members.user", "firstName lastName username avatar")

    if (!group) {
      return res.status(404).json({ message: "Group not found" })
    }

    const { netByUser, totalExpensesCents, expenseCount } = await buildGroupNetBalances(group._id)
    const minimumTransactions = computeGreedyTransactions(netByUser)

    const balancesWithUsers = {}
    for (const [userId, netCents] of netByUser.entries()) {
      const member = group.members.find(m => m.user._id.toString() === userId)
      if (member) {
        balancesWithUsers[userId] = {
          netCents,
          net: netCents / 100,
          youOwe: netCents < 0 ? Math.abs(netCents) / 100 : 0,
          youAreOwed: netCents > 0 ? netCents / 100 : 0,
          user: member.user
        }
      }
    }

    const transactionsWithUsers = minimumTransactions.map(transaction => {
      const fromMember = group.members.find(m => m.user._id.toString() === transaction.from)
      const toMember = group.members.find(m => m.user._id.toString() === transaction.to)

      return {
        ...transaction,
        from: fromMember ? fromMember.user : null,
        to: toMember ? toMember.user : null
      }
    })

    res.json({
      data: {
        totalExpenses: totalExpensesCents / 100,
        balances: balancesWithUsers,
        minimumTransactions: transactionsWithUsers,
        expenseCount,
        memberCount: group.members.length,
        currency: req.user.preferences?.currency || "USD",
      }
    })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Generate and persist a settle-up plan using a greedy algorithm
router.post("/:id/settle-up", async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
      isActive: true,
    }).populate("members.user", "firstName lastName username avatar")

    if (!group) {
      return fail(res, "Group not found", 404)
    }

    const memberIds = group.members.map((m) => m.user._id.toString())
    if (memberIds.length === 0) {
      return ok(res, { settlements: [], totals: { pendingCents: 0, confirmedCents: 0 } })
    }

    const { netByUser } = await buildGroupNetBalances(group._id)
    const minimumTransactions = computeGreedyTransactions(netByUser)

    // Avoid duplicates: update the plan by removing previous PENDING settlements only
    // We KEEP confirmed settlements as history
    await Settlement.deleteMany({ groupId: group._id, status: "PENDING" })

    const settlementsToCreate = minimumTransactions.map((tx) => ({
      groupId: group._id,
      fromUserId: tx.from,
      toUserId: tx.to,
      amountCents: tx.amountCents,
      status: "PENDING",
    }))

    if (settlementsToCreate.length === 0) {
      return ok(res, { settlements: [], totals: { pendingCents: 0, confirmedCents: 0 } })
    }

    const created = await Settlement.insertMany(settlementsToCreate)
    const populated = await Settlement.find({ _id: { $in: created.map((s) => s._id) } })
      .populate("fromUserId", "firstName lastName username avatar")
      .populate("toUserId", "firstName lastName username avatar")
      .sort({ createdAt: 1 })
      .lean()

    const requesterId = String(req.user._id)
    const settlementRequests = populated
      .filter((settlement) => String(settlement.fromUserId?._id || settlement.fromUserId) !== requesterId)
      .map((settlement) => ({
        userId: String(settlement.fromUserId?._id || settlement.fromUserId),
        type: "SETTLEMENT_REQUESTED",
        title: `Payment requested in ${group.name}`,
        message: `${req.user.firstName} requested ${settlement.amountCents / 100} from you.`,
        entityType: "settlement",
        entityId: String(settlement._id),
        groupId: group._id,
        data: {
          groupId: String(group._id),
          settlementId: String(settlement._id),
          fromUserId: String(settlement.fromUserId?._id || settlement.fromUserId),
          toUserId: String(settlement.toUserId?._id || settlement.toUserId),
          amountCents: settlement.amountCents,
          paymentLink: settlement.paymentLink || null,
          paymentProvider: settlement.paymentProvider || null,
          actionUrl: settlement.paymentLink || `/groups/${group._id}`,
        },
        actionUrl: settlement.paymentLink || `/groups/${group._id}`,
      }))

    await Promise.all(
      settlementRequests.map((payload) => notificationService.createNotification(payload, { io: req.io })),
    )

    await Promise.all(
      populated.map((settlement) =>
        appendLedgerEvent({
          req,
          eventType: "SETTLEMENT_PLANNED",
          entityType: "settlement",
          entityId: settlement._id,
          groupId: group._id,
          payload: {
            fromUserId: settlement.fromUserId?._id || settlement.fromUserId,
            toUserId: settlement.toUserId?._id || settlement.toUserId,
            amountCents: settlement.amountCents,
            status: settlement.status,
          },
        }),
      ),
    )

    const pendingCents = populated.reduce((sum, s) => sum + (s.status === "PENDING" ? s.amountCents : 0), 0)
    const confirmedCents = populated.reduce((sum, s) => sum + (s.status === "CONFIRMED" ? s.amountCents : 0), 0)

    try {
      req.io?.to(`group_${group._id}`).emit("settlement:plan-updated", {
        groupId: String(group._id),
      })
    } catch {}

    await invalidateGroupCaches({ req, group })
    return ok(res, { settlements: populated, totals: { pendingCents, confirmedCents } })
  } catch (error) {
    return fail(res, error.message || "Server error", 500)
  }
})

// Get persisted settlements for a group
router.get("/:id/settlements", cacheUserResponse({ namespace: "groups", ttlSeconds: 45 }), async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
      isActive: true,
    }).select("_id")

    if (!group) {
      return fail(res, "Group not found", 404)
    }

    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 200 })
    const settlements = await Settlement.find({ groupId: group._id })
      .populate("fromUserId", "firstName lastName username avatar")
      .populate("toUserId", "firstName lastName username avatar")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean()

    const pendingCents = settlements.reduce((sum, s) => sum + (s.status === "PENDING" ? s.amountCents : 0), 0)
    const confirmedCents = settlements.reduce((sum, s) => sum + (s.status === "CONFIRMED" ? s.amountCents : 0), 0)

    const total = await Settlement.countDocuments({ groupId: group._id })
    return ok(res, {
      settlements,
      totals: { pendingCents, confirmedCents },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return fail(res, error.message || "Server error", 500)
  }
})

// Delete group (only creator can delete, regardless of active expenses)
router.delete("/:id", async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      isActive: true,
    })

    if (!group) {
      return res.status(404).json({ message: "Group not found" })
    }

    // Only the user who created the group can delete it
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the group creator can delete this group" })
    }

    // Permanently remove all related expenses
    await Expense.deleteMany({
      groupId: group._id,
    })

    // Permanently remove the group itself
    await Group.deleteOne({ _id: group._id })

    // Emit to group members so clients can update their UI
    req.io.to(`group_${group._id}`).emit("group_deleted", {
      groupId: group._id,
      deletedBy: req.user._id,
    })

    await logAuditEvent({
      req,
      action: "GROUP_DELETED",
      entityType: "group",
      entityId: group._id,
      groupId: group._id,
      statusCode: 200,
      metadata: {},
    })

    await invalidateGroupCaches({ req, group })
    res.json({ message: "Group deleted permanently" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Remove member from group
router.delete("/:id/members/:userId", async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
      isActive: true,
    })

    if (!group) {
      return res.status(404).json({ message: "Group not found" })
    }

    // Check if user is admin or removing themselves
    const userMember = group.members.find((member) => member.user.toString() === req.user._id.toString())

    const isAdmin = userMember.role === "admin"
    const isRemovingSelf = req.params.userId === req.user._id.toString()

    if (!isAdmin && !isRemovingSelf) {
      return res.status(403).json({ message: "Only admins can remove other members" })
    }

    // Remove member
    group.members = group.members.filter((member) => member.user.toString() !== req.params.userId)

    await group.save()

    // Emit to group members
    req.io.to(`group_${group._id}`).emit("member_removed", {
      groupId: group._id,
      removedUserId: req.params.userId,
    })

    await invalidateGroupCaches({ req, group, extraUserIds: [req.params.userId] })
    res.json({ message: "Member removed successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Update member role (admin only)
router.put("/:id/members/:userId", async (req, res) => {
  try {
    const { role } = req.body

    if (!role || !["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'member'" })
    }

    const group = await Group.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
      isActive: true,
    })

    if (!group) {
      return res.status(404).json({ message: "Group not found" })
    }

    // Check if requester is admin
    const requesterMember = group.members.find((m) => m.user.toString() === req.user._id.toString())
    if (!requesterMember || requesterMember.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update member roles" })
    }

    // Find and update the target member's role
    const targetMember = group.members.find((m) => m.user.toString() === req.params.userId)
    if (!targetMember) {
      return res.status(404).json({ message: "Member not found in group" })
    }

    targetMember.role = role
    await group.save()

    // Emit update to group members
    req.io.to(`group_${group._id}`).emit("member_role_updated", {
      groupId: group._id,
      userId: req.params.userId,
      role,
    })

    await invalidateGroupCaches({ req, group, extraUserIds: [req.params.userId] })
    res.json({ message: "Member role updated successfully", role })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
