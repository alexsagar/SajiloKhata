const express = require("express")
const multer = require("multer")
const path = require("path")
const Expense = require("../models/Expense")
const Group = require("../models/Group")
const User = require("../models/User")
const { body, validationResult } = require("express-validator")
const OCRService = require("../services/ocrService")
const { createNotification } = require("../services/notificationService")
const { toCents, fromCents } = require("../utils/money")
const { ok, fail } = require("../utils/http")

const router = express.Router()

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
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, groupId } = req.query

    // Build query
    const query = {
      status: "active",
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
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
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
router.get("/group/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params
    const { page = 1, limit = 20 } = req.query

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
      status: "active",
    })
      .select('description amountCents currencyCode category date paidBy splits status createdAt')
      .populate({ path: 'paidBy', select: 'firstName lastName username avatar' })
      .populate({ path: 'splits.user', select: 'firstName lastName username' })
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean()

    const total = await Expense.countDocuments({ groupId, status: "active" })

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
router.get("/:id", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .select('description amountCents currency category date paidBy groupId splits status notes createdAt')
      .populate({ path: 'paidBy', select: 'firstName lastName username avatar' })
      .populate({ path: 'splits.user', select: 'firstName lastName username avatar' })
      .populate({ path: 'groupId', select: 'name members' })
      .lean()

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" })
    }

    // Check if user is member of the group
    const isMember = expense.groupId.members.some((member) => member.user.toString() === req.user._id.toString())

    if (!isMember) {
      return res.status(403).json({ message: "Access denied" })
    }

    res.json(expense)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Test route to debug FormData parsing
router.post("/test", upload.single("receipt"), async (req, res) => {
  
  
  
  
  res.json({ 
    message: 'Test successful',
    body: req.body,
    file: req.file ? { name: req.file.originalname, size: req.file.size } : null
  })
})

// Test route without file upload
router.post("/test-no-file", async (req, res) => {
  
  
  
  res.json({ 
    message: 'Test successful (no file)',
    body: req.body
  })
})

// Test route to check expense storage and retrieval
router.get("/test-storage", async (req, res) => {
  try {
    
    
    
    // Check if any expenses exist for this user
    const userExpenses = await Expense.find({
      $or: [
        { paidBy: req.user._id },
        { createdBy: req.user._id },
        { "splits.user": req.user._id }
      ]
    }).select('_id description amountCents paidBy createdBy groupId status')
    
    
    
    
    // Check personal expenses specifically
    const personalExpenses = await Expense.find({
      groupId: null,
      paidBy: req.user._id,
      status: "active"
    }).select('_id description amountCents paidBy createdBy status')
    
    
    
    
    res.json({
      message: 'Storage test complete',
      totalExpenses: userExpenses.length,
      personalExpenses: personalExpenses.length,
      expenses: userExpenses
    })
  } catch (error) {
    
    res.status(500).json({ message: 'Storage test failed', error: error.message })
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
      (currencyCode && ['USD','EUR','NPR','INR','GBP','AUD','CAD','JPY','CNY','CHF'].includes(currencyCode.toUpperCase()) && currencyCode.toUpperCase()) ||
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

    // Handle receipt upload
    let receiptData = null
    if (req.file) {
      try {
        const ocrResult = await OCRService.processReceipt(req.file.buffer)
        receiptData = {
          filename: req.file.originalname,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: ocrResult.url || null,
        }
      } catch (ocrError) {
        
        // Continue without OCR data
        receiptData = {
          filename: req.file.originalname,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      }
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

    await expense.save()
    await expense.populate("paidBy", "firstName lastName username avatar")
    await expense.populate("splits.user", "firstName lastName username")

    
    
    
    
    
    
    
    

    // Create notifications for group expenses
    if (isGroup) {
      const affectedUsers = expenseSplits
        .filter((split) => split.user !== req.user._id.toString())
        .map((split) => split.user)

      for (const userId of affectedUsers) {
        await createNotification({
          userId,
          type: "expense_added",
          title: "New expense added",
          message: `${req.user.firstName} added "${description}" for ${fromCents(amountCents)}`,
          data: {
            expenseId: expense._id,
            groupId,
            fromUserId: req.user._id,
            amount: fromCents(amountCents),
          },
        })
      }

      // Emit to group members
      if (req.io) {
        req.io.to(`group_${groupId}`).emit("expense_added", expense)
      }
    }

    
    return ok(res, expense, 201)
  } catch (error) {
    
    return fail(res, error.message || "Create expense failed", 400)
  }
})

// Update expense
router.put("/:id", async (req, res) => {
  try {
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

    // Emit to group members if it's a group expense
    if (expense.groupId && req.io) {
      req.io.to(`group_${expense.groupId._id}`).emit("expense_updated", expense)
    }

    return ok(res, expense)
  } catch (error) {
    
    return fail(res, error.message || "Update expense failed", 500)
  }
})

// Delete expense
router.delete("/:id", async (req, res) => {
  try {
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

    // Emit to group members if it's a group expense
    if (expense.groupId && req.io) {
      req.io.to(`group_${expense.groupId._id}`).emit("expense_deleted", {
        expenseId: expense._id,
        groupId: expense.groupId._id,
      })
    }

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

    return ok(res, { message: "Split settled successfully" })
  } catch (error) {
    
    return fail(res, error.message || "Settle split failed", 500)
  }
})

module.exports = router
