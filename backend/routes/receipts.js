const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs/promises")
const { body, validationResult } = require("express-validator")
const Receipt = require("../models/Receipt")
const Expense = require("../models/Expense")
const { getPagination } = require("../utils/query")
const { enqueueReceiptProcessing, isReceiptQueueAvailable } = require("../queues/receiptQueue")
const { learnAndResolveMerchant } = require("../services/merchantLearningService")

const router = express.Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/receipts")
    fs.mkdir(uploadPath, { recursive: true })
      .then(() => cb(null, uploadPath))
      .catch((err) => cb(err))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `receipt-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === "application/pdf"
    if (mimetype && extname) return cb(null, true)
    return cb(new Error("Only image files (JPEG, PNG, WebP) and PDF files are allowed"))
  },
})

router.post("/upload", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    if (!isReceiptQueueAvailable()) {
      return res.status(503).json({
        message: "Receipt processing is temporarily unavailable",
        code: "QUEUE_UNAVAILABLE",
      })
    }

    const receipt = await Receipt.create({
      userId: req.user._id,
      originalName: req.file.originalname,
      filename: req.file.filename,
      filePath: `/uploads/receipts/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ocrData: {
        processingStatus: "pending",
        parsedData: {},
      },
    })

    await enqueueReceiptProcessing({ receiptId: receipt._id.toString() })

    return res.status(202).json({
      success: true,
      data: {
        id: receipt._id,
        filename: receipt.filename,
        path: receipt.filePath,
        processingStatus: "pending",
      },
    })
  } catch (error) {
    return res.status(500).json({ message: "Error processing receipt", error: error.message })
  }
})

router.get("/", async (req, res) => {
  try {
    const { expenseId, requiresReview, duplicateOnly, processingStatus } = req.query
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 200 })

    const query = { userId: req.user._id }
    if (expenseId) query.expenseId = expenseId
    if (requiresReview != null) {
      query["ocrData.requiresReview"] = String(requiresReview) === "true"
    }
    if (duplicateOnly != null && String(duplicateOnly) === "true") {
      query["ocrData.duplicateDetection.isDuplicate"] = true
    }
    if (processingStatus) {
      const allowed = new Set(["pending", "processing", "completed", "failed"])
      if (allowed.has(String(processingStatus))) {
        query["ocrData.processingStatus"] = String(processingStatus)
      }
    }

    const receipts = await Receipt.find(query)
      .populate("expenseId", "description amountCents")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean()

    const total = await Receipt.countDocuments(query)

    return res.json({
      success: true,
      data: {
        receipts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
})

router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await Receipt.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
          linkedReceipts: { $sum: { $cond: [{ $ne: ["$expenseId", null] }, 1, 0] } },
          avgConfidence: { $avg: "$ocrData.confidence" },
        },
      },
    ])

    const recentReceipts = await Receipt.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("filename ocrData.parsedData.merchant ocrData.parsedData.total createdAt")
      .lean()

    return res.json({
      stats: stats[0] || {
        totalReceipts: 0,
        totalSize: 0,
        linkedReceipts: 0,
        avgConfidence: 0,
      },
      recentReceipts,
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("expenseId", "description amountCents groupId")

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" })
    }

    return res.json({ receipt })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
})

router.put("/:id", [body("parsedData").isObject().withMessage("Parsed data must be an object")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { parsedData } = req.body
    let nextParsedData = parsedData
    if (parsedData?.merchant) {
      const learned = await learnAndResolveMerchant(req.user._id, parsedData.merchant)
      nextParsedData = {
        ...parsedData,
        merchant: learned.canonicalName || parsedData.merchant,
        merchantCanonical: learned.normalizedName || parsedData.merchantCanonical || null,
      }
    }
    const receipt = await Receipt.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        $set: {
          "ocrData.parsedData": nextParsedData,
          "ocrData.requiresReview": false,
          "ocrData.reviewReasons": [],
          "ocrData.reviewedAt": new Date(),
          "ocrData.reviewedByUser": true,
          updatedAt: new Date(),
        },
      },
      { new: true },
    )

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" })
    }

    return res.json({ message: "Receipt updated successfully", receipt })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
})

router.post("/:id/review", async (req, res) => {
  try {
    const receipt = await Receipt.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        $set: {
          "ocrData.requiresReview": false,
          "ocrData.reviewReasons": [],
          "ocrData.reviewedAt": new Date(),
          "ocrData.reviewedByUser": true,
          updatedAt: new Date(),
        },
      },
      { new: true },
    )
    if (!receipt) return res.status(404).json({ message: "Receipt not found" })
    return res.json({ message: "Receipt marked as reviewed", receipt })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
})

router.put("/:id/link-expense", [body("expenseId").isMongoId().withMessage("Valid expense ID is required")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { expenseId } = req.body
    const expense = await Expense.findOne({
      _id: expenseId,
      $or: [{ paidBy: req.user._id }, { "splits.user": req.user._id }],
    })

    if (!expense) {
      return res.status(404).json({ message: "Expense not found or access denied" })
    }

    const receipt = await Receipt.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        $set: {
          expenseId,
          isLinkedToExpense: true,
          updatedAt: new Date(),
        },
      },
      { new: true },
    )

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" })
    }

    return res.json({ message: "Receipt linked to expense successfully", receipt })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
})

router.post("/:id/reprocess", async (req, res) => {
  try {
    if (!isReceiptQueueAvailable()) {
      return res.status(503).json({
        message: "Receipt processing is temporarily unavailable",
        code: "QUEUE_UNAVAILABLE",
      })
    }

    const receipt = await Receipt.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" })
    }

    await Receipt.updateOne(
      { _id: receipt._id },
      {
        $set: {
          "ocrData.processingStatus": "pending",
          "ocrData.processingError": null,
          updatedAt: new Date(),
        },
      },
    )
    await enqueueReceiptProcessing({ receiptId: receipt._id.toString() })

    return res.status(202).json({
      message: "Receipt reprocessing queued",
      receiptId: receipt._id,
      processingStatus: "pending",
    })
  } catch (error) {
    return res.status(500).json({ message: "Error reprocessing receipt" })
  }
})

router.delete("/:id", async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" })
    }

    const relativePath = String(receipt.filePath || "").replace(/^[/\\]+/, "")
    const filePath = path.join(__dirname, "..", relativePath)
    await fs.unlink(filePath).catch(() => {})

    await Receipt.findByIdAndDelete(receipt._id)
    return res.json({ message: "Receipt deleted successfully" })
  } catch (error) {
    return res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
