const express = require("express")
const Group = require("../models/Group")
const User = require("../models/User")
const Expense = require("../models/Expense")
const { body, validationResult } = require("express-validator")
const { ExpenseCalculator } = require("../utils/expenseCalculator")

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
      .select('name description members createdBy category updatedAt')
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

// Delete group
router.delete("/:id", async (req, res) => {
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
      return res.status(403).json({ message: "Only group admins can delete the group" })
    }

    // Check if group has active expenses
    const activeExpenses = await Expense.countDocuments({
      groupId: group._id,
      status: "active",
    })

    if (activeExpenses > 0) {
      return res.status(400).json({ 
        message: "Cannot delete group with active expenses. Please settle all expenses first.",
        activeExpenses: activeExpenses
      })
    }

    // Soft delete the group (mark as inactive)
    group.isActive = false
    group.deletedAt = new Date()
    group.deletedBy = req.user._id
    await group.save()

    // Also mark all related expenses as deleted
    await Expense.updateMany(
      { groupId: group._id },
      { 
        status: "deleted",
        deletedAt: new Date(),
        deletedBy: req.user._id
      }
    )

    // Emit to group members
    req.io.to(`group_${group._id}`).emit("group_deleted", {
      groupId: group._id,
      deletedBy: req.user._id,
    })

    res.json({ message: "Group deleted successfully" })
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