const express = require("express")
const multer = require("multer")
const path = require("path")
const Expense = require("../models/Expense")
const Group = require("../models/Group")
const User = require("../models/User")
const Settlement = require("../models/Settlement")
const { body, validationResult } = require("express-validator")
const notificationService = require("../services/notificationService")
const { toCents, fromCents } = require("../utils/money")
const { ok, fail } = require("../utils/http")
const { getPagination, escapeRegex } = require("../utils/query")
const { enqueueExpenseProcessing, isExpenseQueueAvailable } = require("../queues/expenseQueue")
const { cacheUserResponse } = require("../middleware/cache")
const { bumpUsersCacheVersion } = require("../services/cacheService")
const { logAuditEvent } = require("../services/auditService")
const { appendLedgerEvent } = require("../services/ledgerService")

const router = express.Router()

async function invalidateExpenseCaches({ req, group = null, groupId = null, extraUserIds = [] }) {
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

function formatAmount(cents) {
  return fromCents(Number(cents || 0)).toFixed(2)
}

function getSplitShareCents(splits, userId) {
  const split = (splits || []).find((s) => String(s.user) === String(userId) || String(s.user?._id) === String(userId))
  return split ? Number(split.amountCents || 0) : null
}

function extractMentionHandles(text) {
  if (!text) return []
  const matches = String(text).match(/@([a-zA-Z0-9_]+)/g) || []
  return [...new Set(matches.map((token) => token.slice(1).toLowerCase()))]
}

async function getMentionRecipientsForExpense({ expense, handles, actorUserId }) {
  if (!handles.length) return []

  let candidateIds = []
  if (expense.groupId) {
    const group = await Group.findById(expense.groupId).select("members.user").lean()
    candidateIds = (group?.members || []).map((m) => String(m.user))
  } else {
    candidateIds = [String(expense.paidBy), String(expense.createdBy)]
  }

  const users = await User.find({
    _id: { $in: candidateIds },
    username: { $exists: true, $ne: null },
  })
    .select("_id username")
    .lean()

  const found = []
  for (const user of users) {
    if (!user?.username) continue
    if (String(user._id) === String(actorUserId)) continue
    if (handles.includes(String(user.username).toLowerCase())) {
      found.push(user)
    }
  }
  return found
}

async function reconcileConfirmedSettlementsForGroup(groupId) {
  const settlements = await Settlement.find({
    groupId,
    status: "CONFIRMED",
  })
    .select("fromUserId toUserId amountCents confirmedAt createdAt")
    .sort({ confirmedAt: 1, createdAt: 1 })
    .lean()

  if (!settlements.length) return

  const expenses = await Expense.find({
    groupId,
    status: "active",
  }).sort({ date: 1, createdAt: 1 })

  const now = new Date()
  const changedExpenseIds = new Set()

  for (const settlement of settlements) {
    let remainingCents = Math.max(0, Number(settlement.amountCents || 0))
    if (remainingCents <= 0) continue

    for (const expense of expenses) {
      if (remainingCents <= 0) break
      if (String(expense.paidBy) !== String(settlement.toUserId)) continue

      let changed = false
      for (const split of expense.splits) {
        if (remainingCents <= 0) break
        if (String(split.user) !== String(settlement.fromUserId)) continue
        if (split.settled) continue

        const dueCents = Math.max(0, Number(split.amountCents || 0))
        if (dueCents <= 0) {
          split.settled = true
          split.settledAt = now
          changed = true
          continue
        }

        if (remainingCents >= dueCents) {
          split.settled = true
          split.settledAt = now
          remainingCents -= dueCents
          changed = true
        } else {
          split.amountCents = dueCents - remainingCents
          if (typeof split.amount === "number") {
            split.amount = split.amountCents / 100
          }
          remainingCents = 0
          changed = true
        }
      }

      if (changed) {
        if (expense.splits.every((s) => s.settled)) {
          expense.status = "settled"
          expense.settledAt = now
        }
        changedExpenseIds.add(String(expense._id))
      }
    }
  }

  if (changedExpenseIds.size > 0) {
    await Promise.all(
      expenses
        .filter((e) => changedExpenseIds.has(String(e._id)))
        .map((e) => e.save())
    )
  }
}

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only images (JPEG, PNG) and PDF files are allowed"))
    }
  },
})

// Get expenses (with optional group filter)
router.get("/", cacheUserResponse({ namespace: "expenses", ttlSeconds: 60 }), async (req, res) => {
  try {
    const { category, startDate, endDate, groupId, status, search } = req.query
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 200 })

    const allowedStatuses = new Set(["active", "settled", "disputed", "archived"])
    const requestedStatuses = String(status || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => allowedStatuses.has(s))

    // Build query
    const query = {
      status: requestedStatuses.length > 0 ? { $in: requestedStatuses } : { $in: ["active", "settled"] },
    }

    // If groupId is provided, filter by group and verify membership
    if (groupId) {
      const group = await Group.findOne({
        _id: groupId,
        "members.user": req.user._id,
        isActive: true,
      })

      if (!group) {
        return fail(res, "Group not found", 404)
      }

      // Backfill split settlement flags from confirmed settlements (idempotent),
      // so existing historical records reflect paid status in UI.
      await reconcileConfirmedSettlementsForGroup(groupId)

      query.groupId = groupId
    } else {
      // Get all groups user is member of, plus personal expenses
      const userGroups = await Group.find({
        "members.user": req.user._id,
        isActive: true,
      }).select('_id')

      query.$or = [
        { groupId: { $in: userGroups.map(g => g._id) } },
        { groupId: null, paidBy: req.user._id } // Personal expenses
      ]
    }

    if (category) query.category = category
    if (search && String(search).trim()) {
      query.description = { $regex: escapeRegex(String(search).trim()), $options: "i" }
    }
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = new Date(startDate)
      if (endDate) query.date.$lte = new Date(endDate)
    }

    const expenses = await Expense.find(query)
      .select('description amountCents currencyCode category date paidBy groupId splits status createdAt')
      .populate({ path: 'paidBy', select: 'firstName lastName username avatar' })
      .populate({ path: 'splits.user', select: 'firstName lastName username' })
      .populate({ path: 'groupId', select: 'name' })
      .sort({ date: -1 })
      .limit(limit)
      .skip(skip)
      .lean()

    const total = await Expense.countDocuments(query)

    return ok(res, {
      expenses,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      }
    })
  } catch (error) {

    return fail(res, "Server error", 500)
  }
})

// Get expenses for a group
router.get("/group/:groupId", cacheUserResponse({ namespace: "expenses", ttlSeconds: 60 }), async (req, res) => {
  try {
    const { groupId } = req.params
    const { status } = req.query
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 200 })
    const allowedStatuses = new Set(["active", "settled", "disputed", "archived"])
    const requestedStatuses = String(status || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => allowedStatuses.has(s))
    const statusFilter = requestedStatuses.length > 0 ? { $in: requestedStatuses } : { $in: ["active", "settled"] }

    // Verify user is member of group
    const group = await Group.findOne({
      _id: groupId,
      "members.user": req.user._id,
      isActive: true,
    })

    if (!group) {
      return fail(res, "Group not found", 404)
    }

    const expenses = await Expense.find({
      groupId,
      status: statusFilter,
    })
      .select('description amountCents currencyCode category date paidBy splits status createdAt')
      .populate({ path: 'paidBy', select: 'firstName lastName username avatar' })
      .populate({ path: 'splits.user', select: 'firstName lastName username' })
      .sort({ date: -1 })
      .limit(limit)
      .skip(skip)
      .lean()

    const total = await Expense.countDocuments({ groupId, status: statusFilter })

    return ok(res, {
      expenses,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      }
    })
  } catch (error) {

    return fail(res, "Server error", 500)
  }
})

// Get single expense
router.get("/:id", cacheUserResponse({ namespace: "expenses", ttlSeconds: 60 }), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .select('description amountCents currency category date paidBy groupId splits status notes comments createdAt')
      .populate({ path: 'paidBy', select: 'firstName lastName username avatar' })
      .populate({ path: 'splits.user', select: 'firstName lastName username avatar' })
      .populate({ path: 'groupId', select: 'name members' })
      .populate({ path: 'comments.user', select: 'firstName lastName username avatar' })
      .populate({ path: 'comments.mentions', select: 'firstName lastName username avatar' })
      .lean()

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" })
    }

    if (expense.groupId) {
      const isMember = (expense.groupId.members || []).some(
        (member) => member.user.toString() === req.user._id.toString(),
      )
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" })
      }
    } else {
      const isOwnerOrParticipant =
        String(expense.paidBy?._id || expense.paidBy) === String(req.user._id) ||
        (expense.splits || []).some((split) => String(split.user?._id || split.user) === String(req.user._id))
      if (!isOwnerOrParticipant) {
        return res.status(403).json({ message: "Access denied" })
      }
    }

    res.json(expense)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.get("/:id/comments", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .select("groupId paidBy createdBy comments")
      .populate({ path: "comments.user", select: "firstName lastName username avatar" })
      .populate({ path: "comments.mentions", select: "firstName lastName username avatar" })

    if (!expense) return fail(res, "Expense not found", 404)

    if (expense.groupId) {
      const group = await Group.findOne({
        _id: expense.groupId,
        "members.user": req.user._id,
        isActive: true,
      }).select("_id")
      if (!group) return fail(res, "Access denied", 403)
    } else {
      const allowed = [String(expense.paidBy), String(expense.createdBy)].includes(String(req.user._id))
      if (!allowed) return fail(res, "Access denied", 403)
    }

    return ok(res, {
      comments: (expense.comments || []).map((comment) => ({
        _id: comment._id,
        user: comment.user,
        text: comment.text,
        mentions: comment.mentions || [],
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        editedAt: comment.editedAt || null,
      })),
    })
  } catch (error) {
    return fail(res, "Server error", 500)
  }
})

router.post("/:id/comments", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim()
    if (!text) return fail(res, "Comment text is required", 400)

    const expense = await Expense.findById(req.params.id).select("groupId description paidBy createdBy comments")
    if (!expense) return fail(res, "Expense not found", 404)

    let group = null
    if (expense.groupId) {
      group = await Group.findOne({
        _id: expense.groupId,
        "members.user": req.user._id,
        isActive: true,
      }).select("name members.user")
      if (!group) return fail(res, "Access denied", 403)
    } else {
      const allowed = [String(expense.paidBy), String(expense.createdBy)].includes(String(req.user._id))
      if (!allowed) return fail(res, "Access denied", 403)
    }

    const mentionHandles = extractMentionHandles(text)
    const mentionUsers = await getMentionRecipientsForExpense({
      expense,
      handles: mentionHandles,
      actorUserId: req.user._id,
    })
    const mentionIds = mentionUsers.map((u) => u._id)

    expense.comments.push({
      user: req.user._id,
      text,
      mentions: mentionIds,
    })
    await expense.save()

    const createdComment = expense.comments[expense.comments.length - 1]
    await Expense.populate(createdComment, { path: "user", select: "firstName lastName username avatar" })
    await Expense.populate(createdComment, { path: "mentions", select: "firstName lastName username avatar" })

    if (mentionUsers.length > 0) {
      await notificationService.createManyNotifications(
        mentionUsers.map((u) => u._id),
        {
          type: "EXPENSE_COMMENT_MENTION",
          title: "You were mentioned in a comment",
          message: `${req.user.firstName} mentioned you on "${expense.description}".`,
          entityType: "expense",
          entityId: expense._id,
          groupId: expense.groupId || null,
          actionUrl: `/expenses/${expense._id}`,
          data: {
            expenseId: String(expense._id),
            commentId: String(createdComment._id),
            groupId: expense.groupId ? String(expense.groupId) : null,
          },
        },
        { io: req.io },
      )
    }

    if (expense.groupId) {
      await appendLedgerEvent({
        req,
        eventType: "EXPENSE_COMMENT_ADDED",
        entityType: "expense",
        entityId: expense._id,
        groupId: expense.groupId,
        payload: {
          commentId: createdComment._id,
          snippet: text.slice(0, 120),
          mentionCount: mentionIds.length,
        },
      })
      req.io?.to(`group_${expense.groupId}`).emit("expense_comment_added", {
        expenseId: String(expense._id),
        commentId: String(createdComment._id),
      })
      await invalidateExpenseCaches({ req, group, groupId: expense.groupId })
    }

    return ok(res, { comment: createdComment }, 201)
  } catch (error) {
    return fail(res, "Failed to add comment", 500)
  }
})

router.patch("/:id/comments/:commentId", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim()
    if (!text) return fail(res, "Comment text is required", 400)

    const expense = await Expense.findById(req.params.id).select("groupId description comments")
    if (!expense) return fail(res, "Expense not found", 404)

    const comment = expense.comments.id(req.params.commentId)
    if (!comment) return fail(res, "Comment not found", 404)
    if (String(comment.user) !== String(req.user._id)) {
      return fail(res, "Only comment owner can edit", 403)
    }

    if (expense.groupId) {
      const group = await Group.findOne({
        _id: expense.groupId,
        "members.user": req.user._id,
        isActive: true,
      }).select("_id")
      if (!group) return fail(res, "Access denied", 403)
    }

    const mentionHandles = extractMentionHandles(text)
    const mentionUsers = await getMentionRecipientsForExpense({
      expense,
      handles: mentionHandles,
      actorUserId: req.user._id,
    })
    const mentionIds = mentionUsers.map((u) => u._id)

    comment.text = text
    comment.mentions = mentionIds
    comment.editedAt = new Date()
    await expense.save()

    await Expense.populate(comment, { path: "user", select: "firstName lastName username avatar" })
    await Expense.populate(comment, { path: "mentions", select: "firstName lastName username avatar" })

    if (mentionUsers.length > 0) {
      await notificationService.createManyNotifications(
        mentionUsers.map((u) => u._id),
        {
          type: "EXPENSE_COMMENT_MENTION",
          title: "You were mentioned in a comment",
          message: `${req.user.firstName} mentioned you on "${expense.description}".`,
          entityType: "expense",
          entityId: expense._id,
          groupId: expense.groupId || null,
          actionUrl: `/expenses/${expense._id}`,
          data: {
            expenseId: String(expense._id),
            commentId: String(comment._id),
            groupId: expense.groupId ? String(expense.groupId) : null,
          },
        },
        { io: req.io },
      )
    }

    return ok(res, { comment })
  } catch (error) {
    return fail(res, "Failed to update comment", 500)
  }
})

router.delete("/:id/comments/:commentId", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id).select("groupId paidBy createdBy comments")
    if (!expense) return fail(res, "Expense not found", 404)

    const comment = expense.comments.id(req.params.commentId)
    if (!comment) return fail(res, "Comment not found", 404)

    let group = null
    const isOwner = String(comment.user) === String(req.user._id)

    if (expense.groupId) {
      group = await Group.findOne({
        _id: expense.groupId,
        "members.user": req.user._id,
        isActive: true,
      }).select("name members")
      if (!group) return fail(res, "Access denied", 403)

      const member = (group.members || []).find((m) => String(m.user) === String(req.user._id))
      const isAdmin = member?.role === "admin"
      if (!isOwner && !isAdmin) return fail(res, "Only comment owner or admin can delete", 403)
    } else {
      const allowed = [String(expense.paidBy), String(expense.createdBy)].includes(String(req.user._id))
      if (!isOwner && !allowed) return fail(res, "Access denied", 403)
    }

    comment.deleteOne()
    await expense.save()

    if (expense.groupId) {
      await appendLedgerEvent({
        req,
        eventType: "EXPENSE_COMMENT_DELETED",
        entityType: "expense",
        entityId: expense._id,
        groupId: expense.groupId,
        payload: {
          commentId: req.params.commentId,
        },
      })
      req.io?.to(`group_${expense.groupId}`).emit("expense_comment_deleted", {
        expenseId: String(expense._id),
        commentId: req.params.commentId,
      })
      await invalidateExpenseCaches({ req, group, groupId: expense.groupId })
    }

    return ok(res, { message: "Comment deleted" })
  } catch (error) {
    return fail(res, "Failed to delete comment", 500)
  }
})

// Create expense (personal or group)
router.post("/", upload.single("receipt"), async (req, res) => {
  try {

    const { groupId, description, amount, category, splits, date, notes, splitType, currencyCode, createdBy } = req.body

    // Basic validation
    if (!description || !description.trim()) {
      return fail(res, "Description is required")
    }

    if (!amount || parseFloat(amount) <= 0) {
      return fail(res, "Amount must be greater than 0")
    }

    // Ensure createdBy is available
    const expenseCreator = createdBy || req.user._id




    const isGroup = !!(groupId && String(groupId).trim())
    let group = null

    // ACL: for group expense, requester must be member
    if (isGroup) {
      group = await Group.findById(groupId)
      if (!group) {
        return fail(res, "Group not found", 404)
      }

      const isMember = group.members?.some(m => m.user?.toString?.() === req.user._id.toString())
      if (!isMember) {
        return fail(res, "Not a member of this group", 403)
      }
    }

    // Determine currency
    const currency =
      (currencyCode && ['USD', 'EUR', 'NPR', 'INR', 'GBP', 'AUD', 'CAD', 'JPY', 'CNY', 'CHF'].includes(currencyCode.toUpperCase()) && currencyCode.toUpperCase()) ||
      (isGroup ? group?.currencyCode : req.user.profile?.currencyCode) || 'USD'

    // Convert amount to cents
    const amountCents = toCents(amount)
    if (amountCents <= 0) {
      return fail(res, "Amount must be greater than 0")
    }

    // Build splits
    let expenseSplits = []

    if (isGroup && splits && splits.length > 0) {
      // Parse splits if it's a string (from form data)
      const parsedSplits = typeof splits === "string" ? JSON.parse(splits) : splits

      expenseSplits = parsedSplits.map(s => ({
        user: s.user,
        amountCents: toCents(s.amount || 0),
        percentage: s.percentage || null
      }))

      // Handle equal/percentage splits
      if (splitType === 'equal') {
        const share = Math.floor(amountCents / expenseSplits.length)
        expenseSplits = expenseSplits.map(s => ({ ...s, amountCents: share }))
      } else if (splitType === 'percentage') {
        expenseSplits = expenseSplits.map(s => ({
          ...s,
          amountCents: Math.round((s.percentage || 0) * amountCents / 100)
        }))
      }

      // Deterministic adjustment to ensure sum === total
      const sum = expenseSplits.reduce((a, s) => a + s.amountCents, 0)
      const diff = amountCents - sum
      if (diff !== 0) {
        expenseSplits[expenseSplits.length - 1].amountCents += diff
        if (expenseSplits[expenseSplits.length - 1].amountCents < 0) {
          return fail(res, "Invalid splits after rounding")
        }
      }
    } else {
      // Personal expense or no splits provided - auto-split to current user
      expenseSplits = [{
        user: req.user._id, // Use _id consistently
        amountCents: amountCents,
        percentage: null
      }]
    }

    // ---- Receipt metadata (save immediately, defer OCR) ----
    let receiptData = null
    let receiptBufferArray = null
    if (req.file) {
      if (!isExpenseQueueAvailable()) {
        return fail(res, "Receipt processing is temporarily unavailable", 503, { code: "QUEUE_UNAVAILABLE" })
      }
      receiptData = {
        filename: req.file.originalname,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      }
      // Store buffer as array for queue serialization
      receiptBufferArray = Array.from(req.file.buffer)
    }

    // Create expense
    const expense = new Expense({
      groupId: isGroup ? group.id : null,
      description: description.trim(),
      amountCents: amountCents,
      amount: fromCents(amountCents),
      currencyCode: currency,
      paidBy: req.user._id, // Use _id consistently
      createdBy: expenseCreator, // Use provided createdBy or fallback to current user
      category: category || "other",
      date: date ? new Date(date) : new Date(),
      splits: expenseSplits.map(s => ({
        user: s.user,
        amountCents: s.amountCents,
        amount: fromCents(s.amountCents),
        percentage: s.percentage,
        settled: false,
      })),
      splitType: isGroup ? (splitType || "equal") : "exact",
      receipt: receiptData,
      notes: notes || null,
      status: "active"
    })

    const startSave = Date.now()
    await expense.save()
    await expense.populate("paidBy", "firstName lastName username avatar")
    await expense.populate("splits.user", "firstName lastName username")
    const saveMs = Date.now() - startSave
    console.log(`[Expenses] POST saved in ${saveMs}ms (id: ${expense._id})`)

    // ---- Defer heavy work to queue (non-blocking) ----
    const jobData = {
      expenseId: expense._id.toString(),
    }

    // OCR
    if (receiptBufferArray) {
      jobData.receiptBuffer = receiptBufferArray
      jobData.receiptMeta = receiptData
    }

    // Enqueue OCR (non-blocking)
    if (jobData.receiptBuffer && jobData.receiptBuffer.length > 0) {
      try {
        if (isExpenseQueueAvailable()) {
          await enqueueExpenseProcessing(jobData)
        }
      } catch (enqueueError) {
        if (jobData.receiptBuffer && jobData.receiptBuffer.length > 0) {
          await Expense.deleteOne({ _id: expense._id }).catch(() => {})
          return fail(res, "Receipt processing is temporarily unavailable", 503, { code: "QUEUE_UNAVAILABLE" })
        }
        throw enqueueError
      }
    }

    if (isGroup) {
      const actorId = String(req.user._id)
      const recipientIds = (group.members || [])
        .map((member) => String(member.user))
        .filter((userId) => userId !== actorId)

      await Promise.all(
        recipientIds.map((recipientId) =>
          notificationService.batchNotifications(
            [recipientId],
            {
              type: "EXPENSE_CREATED",
              groupId: group._id,
              batchKey: `EXPENSE_CREATED:${group._id}`,
              timeWindowMs: 2 * 60 * 1000,
              title: `New expense in ${group.name}`,
              message: (() => {
                const shareCents = getSplitShareCents(expense.splits, recipientId)
                if (shareCents != null) {
                  return `${req.user.firstName} added "${expense.description}" in ${group.name}. Total ${formatAmount(amountCents)}, your share ${formatAmount(shareCents)}.`
                }
                return `${req.user.firstName} added "${expense.description}" in ${group.name}. Total ${formatAmount(amountCents)}.`
              })(),
              entityType: "expense",
              entityId: expense._id,
              data: {
                groupId: String(group._id),
                expenseId: String(expense._id),
                amountCents,
              },
              buildContent: (count) => ({
                title: `${count} new expenses in ${group.name}`,
                message: `${count} new expenses were added in ${group.name}.`,
              }),
            },
            { io: req.io },
          ),
        ),
      )

      req.io?.to(`group_${groupId}`).emit("expense_added", expense)
    }

    await logAuditEvent({
      req,
      action: "EXPENSE_CREATED",
      entityType: "expense",
      entityId: expense._id,
      groupId: isGroup ? group._id : null,
      statusCode: 201,
      metadata: {
        amountCents,
        currency,
        splitCount: expense.splits?.length || 0,
      },
    })
    if (isGroup) {
      await appendLedgerEvent({
        req,
        eventType: "EXPENSE_CREATED",
        entityType: "expense",
        entityId: expense._id,
        groupId: group._id,
        payload: {
          amountCents: expense.amountCents,
          paidBy: expense.paidBy?._id || expense.paidBy,
          splits: expense.splits?.map((s) => ({ user: s.user?._id || s.user, amountCents: s.amountCents })) || [],
        },
      })
    }

    await invalidateExpenseCaches({ req, group })
    return ok(res, expense, 201)
  } catch (error) {
    console.error('[Expenses] POST error:', error.message)
    return fail(res, error.message || "Create expense failed", 400)
  }
})

// Update expense
router.put("/:id", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("groupId", "members name")
      .populate("paidBy", "firstName lastName")

    if (!expense) {
      return fail(res, "Expense not found", 404)
    }

    // Check permissions
    if (expense.groupId) {
      // Group expense - check membership
      const isMember = expense.groupId.members.some((member) => member.user.toString() === req.user._id.toString())
      if (!isMember) {
        return fail(res, "Access denied", 403)
      }

      // Only the person who paid or group admin can edit
      if (expense.paidBy._id.toString() !== req.user._id.toString()) {
        const userMember = expense.groupId.members.find((member) => member.user.toString() === req.user._id.toString())
        if (!userMember || userMember.role !== "admin") {
          return fail(res, "Only the payer or group admin can edit this expense", 403)
        }
      }
    } else {
      // Personal expense - only the payer can edit
      if (expense.paidBy._id.toString() !== req.user._id.toString()) {
        return fail(res, "Only the payer can edit this expense", 403)
      }
    }

    const previousAmountCents = Number(expense.amountCents || 0)
    const previousDescription = expense.description
    const previousSplits = new Map(
      (expense.splits || []).map((split) => [String(split.user), Number(split.amountCents || 0)]),
    )

    const { description, amount, category, notes, splits } = req.body

    if (description) expense.description = description.trim()
    if (amount) {
      const newAmountCents = toCents(amount)
      if (newAmountCents <= 0) {
        return fail(res, "Amount must be greater than 0")
      }
      expense.amountCents = newAmountCents
      expense.amount = fromCents(newAmountCents)
    }
    if (category) expense.category = category
    if (notes !== undefined) expense.notes = notes

    if (splits && expense.groupId) {
      // Only update splits for group expenses
      const targetAmountCents = toCents(amount ?? fromCents(expense.amountCents))
      let splitCents = splits.map((split) => ({
        user: split.user,
        amountCents: toCents(split.amount),
        percentage: split.percentage || null,
        settled: split.settled || false,
      }))

      const sumSplitCents = splitCents.reduce((sum, s) => sum + s.amountCents, 0)
      const diff = targetAmountCents - sumSplitCents
      if (diff !== 0) {
        splitCents[splitCents.length - 1].amountCents += diff
        if (splitCents[splitCents.length - 1].amountCents < 0) {
          return fail(res, "Invalid splits: rounding adjustment would make a share negative")
        }
      }

      expense.splits = splitCents.map((split) => ({
        user: split.user,
        amountCents: split.amountCents,
        amount: fromCents(split.amountCents),
        percentage: split.percentage,
        settled: split.settled,
      }))
    }

    await expense.save()
    await expense.populate("paidBy", "firstName lastName username avatar")
    await expense.populate("splits.user", "firstName lastName username")

    if (expense.groupId) {
      const actorId = String(req.user._id)
      const recipientIds = (expense.groupId.members || [])
        .map((member) => String(member.user))
        .filter((userId) => userId !== actorId)

      const amountChanged = previousAmountCents !== Number(expense.amountCents || 0)
      const descriptionChanged = previousDescription !== expense.description
      const changeSummary = amountChanged || descriptionChanged ? "Expense updated" : "Expense details changed"

      await notificationService.createManyNotifications(
        recipientIds,
        {
          type: "EXPENSE_UPDATED",
          title: `Expense updated in ${expense.groupId.name}`,
          message: `${changeSummary}. New amount ${formatAmount(expense.amountCents)}.`,
          entityType: "expense",
          entityId: expense._id,
          groupId: expense.groupId._id,
          data: {
            groupId: String(expense.groupId._id),
            expenseId: String(expense._id),
            amountCents: expense.amountCents,
            previousAmountCents,
          },
        },
        { io: req.io },
      )

      const splitChangeRecipients = []
      for (const split of expense.splits || []) {
        const uid = String(split.user?._id || split.user)
        if (uid === actorId) continue
        const previousShare = previousSplits.get(uid)
        const currentShare = Number(split.amountCents || 0)
        if (previousShare == null || previousShare === currentShare) continue
        splitChangeRecipients.push({ uid, previousShare, currentShare })
      }

      await Promise.all(
        splitChangeRecipients.map((entry) =>
          notificationService.createNotification(
            {
              userId: entry.uid,
              type: "SPLIT_CHANGED_FOR_YOU",
              title: "Your share was updated",
              message: `Your share changed from ${formatAmount(entry.previousShare)} to ${formatAmount(entry.currentShare)}.`,
              entityType: "expense",
              entityId: expense._id,
              groupId: expense.groupId._id,
              data: {
                groupId: String(expense.groupId._id),
                expenseId: String(expense._id),
                oldShareCents: entry.previousShare,
                newShareCents: entry.currentShare,
              },
            },
            { io: req.io },
          ),
        ),
      )
    }

    // Emit to group members if it's a group expense
    if (expense.groupId && req.io) {
      req.io.to(`group_${expense.groupId._id}`).emit("expense_updated", expense)
    }

    await logAuditEvent({
      req,
      action: "EXPENSE_UPDATED",
      entityType: "expense",
      entityId: expense._id,
      groupId: expense.groupId?._id || null,
      statusCode: 200,
      metadata: {
        amountCents: expense.amountCents,
        description: expense.description,
      },
    })
    if (expense.groupId) {
      await appendLedgerEvent({
        req,
        eventType: "EXPENSE_UPDATED",
        entityType: "expense",
        entityId: expense._id,
        groupId: expense.groupId._id || expense.groupId,
        payload: {
          amountCents: expense.amountCents,
          description: expense.description,
          splitCount: expense.splits?.length || 0,
        },
      })
    }

    await invalidateExpenseCaches({ req, group: expense.groupId, extraUserIds: [String(expense.paidBy._id)] })
    return ok(res, expense)
  } catch (error) {

    return fail(res, error.message || "Update expense failed", 500)
  }
})

// Delete expense
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("groupId", "members name")
      .populate("paidBy", "firstName lastName")

    if (!expense) {
      return fail(res, "Expense not found", 404)
    }

    // Check permissions
    if (expense.groupId) {
      // Group expense - check membership
      const isMember = expense.groupId.members.some((member) => member.user.toString() === req.user._id.toString())
      if (!isMember) {
        return fail(res, "Access denied", 403)
      }

      if (expense.paidBy._id.toString() !== req.user._id.toString()) {
        const userMember = expense.groupId.members.find((member) => member.user.toString() === req.user._id.toString())
        if (!userMember || userMember.role !== "admin") {
          return fail(res, "Only the payer or group admin can delete this expense", 403)
        }
      }
    } else {
      // Personal expense - only the payer can delete
      if (expense.paidBy._id.toString() !== req.user._id.toString()) {
        return fail(res, "Only the payer can delete this expense", 403)
      }
    }

    expense.status = "deleted"
    await expense.save()

    if (expense.groupId) {
      const actorId = String(req.user._id)
      const recipientIds = (expense.groupId.members || [])
        .map((member) => String(member.user))
        .filter((userId) => userId !== actorId)

      await notificationService.createManyNotifications(
        recipientIds,
        {
          type: "EXPENSE_DELETED",
          title: `Expense removed in ${expense.groupId.name}`,
          message: `"${expense.description}" was deleted.`,
          entityType: "expense",
          entityId: expense._id,
          groupId: expense.groupId._id,
          data: {
            groupId: String(expense.groupId._id),
            expenseId: String(expense._id),
          },
        },
        { io: req.io },
      )
    }

    // Emit to group members if it's a group expense
    if (expense.groupId && req.io) {
      req.io.to(`group_${expense.groupId._id}`).emit("expense_deleted", {
        expenseId: expense._id,
        groupId: expense.groupId._id,
      })
    }

    await logAuditEvent({
      req,
      action: "EXPENSE_DELETED",
      entityType: "expense",
      entityId: expense._id,
      groupId: expense.groupId?._id || null,
      statusCode: 200,
      metadata: {
        previousStatus: "active",
        newStatus: "deleted",
      },
    })
    if (expense.groupId) {
      await appendLedgerEvent({
        req,
        eventType: "EXPENSE_DELETED",
        entityType: "expense",
        entityId: expense._id,
        groupId: expense.groupId._id || expense.groupId,
        payload: {
          status: expense.status,
        },
      })
    }

    await invalidateExpenseCaches({ req, group: expense.groupId, extraUserIds: [String(expense.paidBy._id)] })
    return ok(res, { message: "Expense deleted successfully" })
  } catch (error) {

    return fail(res, error.message || "Delete expense failed", 500)
  }
})

// Mark split as settled
router.patch("/:id/settle", async (req, res) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return fail(res, "User ID is required")
    }

    const expense = await Expense.findById(req.params.id)
      .populate("groupId", "members")
      .populate("paidBy", "firstName lastName")

    if (!expense) {
      return fail(res, "Expense not found", 404)
    }

    // Check permissions
    if (expense.groupId) {
      // Group expense - check membership
      const isMember = expense.groupId.members.some((member) => member.user.toString() === req.user._id.toString())
      if (!isMember) {
        return fail(res, "Access denied", 403)
      }
    } else {
      // Personal expense - only the payer can settle
      if (expense.paidBy._id.toString() !== req.user._id.toString()) {
        return fail(res, "Only the payer can settle this expense", 403)
      }
    }

    // Find the split to settle
    const split = expense.splits.find((s) => s.user.toString() === userId)
    if (!split) {
      return fail(res, "Split not found", 404)
    }

    split.settled = true
    split.settledAt = new Date()

    await expense.save()

    // Emit to group members if it's a group expense
    if (expense.groupId && req.io) {
      req.io.to(`group_${expense.groupId._id}`).emit("split_settled", {
        expenseId: expense._id,
        userId,
        settledBy: req.user._id,
      })
    }

    await invalidateExpenseCaches({ req, group: expense.groupId, extraUserIds: [String(userId), String(expense.paidBy._id)] })
    return ok(res, { message: "Split settled successfully" })
  } catch (error) {

    return fail(res, error.message || "Settle split failed", 500)
  }
})

module.exports = router
