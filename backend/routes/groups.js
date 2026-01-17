const express = require("express")
const Group = require("../models/Group")
const User = require("../models/User")
const Expense = require("../models/Expense")
const Settlement = require("../models/Settlement")
const { body, validationResult } = require("express-validator")
const { ExpenseCalculator } = require("../utils/expenseCalculator")
const { ok, fail } = require("../utils/http")

const router = express.Router()
// Return friends eligible to be added to this group (not already members)
router.get("/:id/friends-eligible", async (req, res) => {
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
    res.json({ data: { added: toAdd.length } })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// Get all user's groups
router.get("/", async (req, res) => {
  try {
    const groups = await Group.find({
      "members.user": req.user._id,
      isActive: true,
    })
      .select('name description members createdBy category updatedAt isActive')
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
router.get("/:id", async (req, res) => {
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

    res.json(group)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get group balance summary
router.get("/:id/balances", async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
      isActive: true,
    }).populate("members.user", "firstName lastName username avatar")

    if (!group) {
      return res.status(404).json({ message: "Group not found" })
    }

    // Get all expenses for the group
    const expenses = await Expense.find({
      groupId: group._id,
      status: "active",
    }).populate("paidBy", "firstName lastName username avatar")
    .populate("splits.user", "firstName lastName username avatar")

    // Calculate balances
    const calculator = new ExpenseCalculator()

    expenses.forEach((expense) => {
      calculator.addExpense({
        paidBy: expense.paidBy._id.toString(),
        splits: expense.splits.map((split) => ({
          userId: split.user.toString(),
          amount: Math.round(Number(split.amountCents || 0)) / 100,
        })),
        amount: Math.round(Number(expense.amountCents || 0)) / 100,
      })
    })

    const summary = calculator.getGroupSummary()

    // Add user information to balances
    const balancesWithUsers = {}
    for (const [userId, balance] of Object.entries(summary.balances)) {
      const member = group.members.find(m => m.user._id.toString() === userId)
      if (member) {
        balancesWithUsers[userId] = {
          ...balance,
          user: member.user
        }
      }
    }

    // Add user information to transactions
    const transactionsWithUsers = summary.minimumTransactions.map(transaction => {
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
        totalExpenses: summary.totalExpenses,
        balances: balancesWithUsers,
        minimumTransactions: transactionsWithUsers,
        expenseCount: expenses.length,
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

    const expenses = await Expense.find({
      groupId: group._id,
      status: "active",
    }).select("amountCents paidBy")

    const memberIds = group.members.map((m) => m.user._id.toString())
    const memberCount = memberIds.length
    if (memberCount === 0) {
      return ok(res, { settlements: [], totals: { pendingCents: 0, confirmedCents: 0 } })
    }

    // Total paid per member (cents)
    const paidByUserCents = new Map(memberIds.map((id) => [id, 0]))
    let totalGroupExpenseCents = 0

    for (const exp of expenses) {
      const cents = Math.round(Number(exp.amountCents || 0))
      if (cents <= 0) continue
      totalGroupExpenseCents += cents

      const payerId = exp.paidBy?.toString?.()
      if (payerId && paidByUserCents.has(payerId)) {
        paidByUserCents.set(payerId, paidByUserCents.get(payerId) + cents)
      }
    }

    // Equal share per member using integer cents; adjust remainder so nets sum to 0
    const baseShare = Math.floor(totalGroupExpenseCents / memberCount)
    const remainder = totalGroupExpenseCents - baseShare * memberCount

    const sortedMemberIds = [...memberIds].sort() // deterministic remainder assignment
    const shareByUserCents = new Map(sortedMemberIds.map((id) => [id, baseShare]))
    if (remainder !== 0) {
      const lastId = sortedMemberIds[sortedMemberIds.length - 1]
      shareByUserCents.set(lastId, shareByUserCents.get(lastId) + remainder)
    }

    // Net balance = paid - share (cents). >0 creditor, <0 debtor.
    const creditors = []
    const debtors = []
    for (const uid of sortedMemberIds) {
      const paid = paidByUserCents.get(uid) || 0
      const share = shareByUserCents.get(uid) || 0
      const net = paid - share
      if (net > 0) creditors.push({ userId: uid, netCents: net })
      else if (net < 0) debtors.push({ userId: uid, netCents: net })
    }

    creditors.sort((a, b) => b.netCents - a.netCents)
    debtors.sort((a, b) => a.netCents - b.netCents) // more negative first

    // Avoid duplicates: remove previous pending settlements for this group
    await Settlement.deleteMany({ groupId: group._id, status: "PENDING" })

    const settlementsToCreate = []
    let i = 0
    let j = 0
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i]
      const debtor = debtors[j]

      const debtorOwes = Math.abs(debtor.netCents)
      const amountCents = Math.min(debtorOwes, creditor.netCents)
      if (amountCents > 0) {
        settlementsToCreate.push({
          groupId: group._id,
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amountCents,
          status: "PENDING",
        })
      }

      creditor.netCents -= amountCents
      debtor.netCents += amountCents

      if (creditor.netCents === 0) i++
      if (debtor.netCents === 0) j++
    }

    if (settlementsToCreate.length === 0) {
      return ok(res, { settlements: [], totals: { pendingCents: 0, confirmedCents: 0 } })
    }

    const created = await Settlement.insertMany(settlementsToCreate)
    const populated = await Settlement.find({ _id: { $in: created.map((s) => s._id) } })
      .populate("fromUserId", "firstName lastName username avatar")
      .populate("toUserId", "firstName lastName username avatar")
      .sort({ createdAt: 1 })
      .lean()

    const pendingCents = populated.reduce((sum, s) => sum + (s.status === "PENDING" ? s.amountCents : 0), 0)
    const confirmedCents = populated.reduce((sum, s) => sum + (s.status === "CONFIRMED" ? s.amountCents : 0), 0)

    return ok(res, { settlements: populated, totals: { pendingCents, confirmedCents } })
  } catch (error) {
    return fail(res, error.message || "Server error", 500)
  }
})

// Get persisted settlements for a group
router.get("/:id/settlements", async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      "members.user": req.user._id,
      isActive: true,
    }).select("_id")

    if (!group) {
      return fail(res, "Group not found", 404)
    }

    const settlements = await Settlement.find({ groupId: group._id })
      .populate("fromUserId", "firstName lastName username avatar")
      .populate("toUserId", "firstName lastName username avatar")
      .sort({ createdAt: -1 })
      .lean()

    const pendingCents = settlements.reduce((sum, s) => sum + (s.status === "PENDING" ? s.amountCents : 0), 0)
    const confirmedCents = settlements.reduce((sum, s) => sum + (s.status === "CONFIRMED" ? s.amountCents : 0), 0)

    return ok(res, { settlements, totals: { pendingCents, confirmedCents } })
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

    res.json({ message: "Member removed successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router