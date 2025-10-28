const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { body, validationResult } = require("express-validator")
const sharp = require("sharp")
const Tesseract = require("tesseract.js")
const Receipt = require("../models/Receipt")
const Expense = require("../models/Expense")

const router = express.Router()

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/receipts")
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, `receipt-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === "application/pdf"

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only image files (JPEG, PNG, WebP) and PDF files are allowed"))
    }
  },
})

// Helper function to process image for OCR
async function processImageForOCR(imagePath) {
  try {
    const processedPath = imagePath.replace(/\.[^/.]+$/, "_processed.jpg")

    await sharp(imagePath)
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .normalize()
      .sharpen()
      .jpeg({ quality: 95 })
      .toFile(processedPath)

    return processedPath
  } catch (error) {
    console.error("Image processing error:", error)
    return imagePath // Return original if processing fails
  }
}

// Helper function to extract text using OCR
async function extractTextFromImage(imagePath) {
  try {
    const processedPath = await processImageForOCR(imagePath)

    const {
      data: { text },
    } = await Tesseract.recognize(processedPath, "eng", {
      logger: (m) => console.log(m),
    })

    // Clean up processed file if it's different from original
    if (processedPath !== imagePath && fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath)
    }

    return text
  } catch (error) {
    console.error("OCR extraction error:", error)
    return ""
  }
}

// Helper function to parse receipt data from text
function parseReceiptData(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let total = 0
  let merchant = ""
  let date = null
  const items = []

  // Patterns for common receipt elements
  const totalPatterns = [/total[:\s]*\$?(\d+\.?\d*)/i, /amount[:\s]*\$?(\d+\.?\d*)/i, /sum[:\s]*\$?(\d+\.?\d*)/i]

  const datePatterns = [/(\d{1,2}\/\d{1,2}\/\d{2,4})/, /(\d{1,2}-\d{1,2}-\d{2,4})/, /(\d{4}-\d{1,2}-\d{1,2})/]

  const pricePattern = /\$?(\d+\.?\d*)/

  // Extract merchant (usually first few lines)
  if (lines.length > 0) {
    merchant = lines[0]
    // If first line looks like an address or phone, try second line
    if (/\d{3}-\d{3}-\d{4}|\d{5}/.test(merchant) && lines.length > 1) {
      merchant = lines[1]
    }
  }

  // Extract date
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern)
      if (match) {
        date = new Date(match[1])
        if (!isNaN(date.getTime())) {
          break
        }
      }
    }
    if (date) break
  }

  // Extract total
  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern)
      if (match) {
        const amount = Number.parseFloat(match[1])
        if (amount > total) {
          total = amount
        }
      }
    }
  }

  // Extract line items
  for (const line of lines) {
    const priceMatch = line.match(pricePattern)
    if (priceMatch && !totalPatterns.some((p) => p.test(line))) {
      const price = Number.parseFloat(priceMatch[1])
      if (price > 0 && price < total) {
        const description = line.replace(pricePattern, "").trim()
        if (description.length > 2) {
          items.push({
            description,
            amount: price,
          })
        }
      }
    }
  }

  return {
    merchant: merchant || "Unknown Merchant",
    total,
    date: date || new Date(),
    items,
    rawText: text,
    confidence: total > 0 ? 0.8 : 0.3,
  }
}

// Upload and process receipt
router.post("/upload", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const receiptUrl = `/uploads/receipts/${req.file.filename}`
    const filePath = req.file.path

    // Extract text using OCR
    console.log("Starting OCR processing...")
    const extractedText = await extractTextFromImage(filePath)

    // Parse receipt data
    const parsedData = parseReceiptData(extractedText)

    // Create receipt record
    const receipt = new Receipt({
      userId: req.user._id,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: receiptUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
      extractedText,
      parsedData,
      processingStatus: "completed",
    })

    await receipt.save()

    res.json({
      success: true,
      data: {
        id: receipt._id,
        filename: receipt.filename,
        path: receipt.path,
        parsedData: receipt.parsedData,
        extractedText: receipt.extractedText,
      },
    })
  } catch (error) {
    console.error("Receipt upload error:", error)
    res.status(500).json({ message: "Error processing receipt" })
  }
})

// Get user's receipts
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, expenseId } = req.query
    const skip = (page - 1) * limit

    const query = { userId: req.user._id }

    if (expenseId) {
      query.expenseId = expenseId
    }

    const receipts = await Receipt.find(query)
      .populate("expenseId", "description amount")
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip(skip)

    const total = await Receipt.countDocuments(query)

    res.json({
      success: true,
      data: {
        receipts,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      }
    })
  } catch (error) {
    console.error("Get receipts error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get specific receipt
router.get("/:id", async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("expenseId", "description amount groupId")

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" })
    }

    res.json({ receipt })
  } catch (error) {
    console.error("Get receipt error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update receipt parsed data
router.put("/:id", [body("parsedData").isObject().withMessage("Parsed data must be an object")], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { parsedData } = req.body

    const receipt = await Receipt.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        parsedData,
        updatedAt: new Date(),
      },
      { new: true },
    )

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" })
    }

    res.json({
      message: "Receipt updated successfully",
      receipt,
    })
  } catch (error) {
    console.error("Update receipt error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Link receipt to expense
router.put(
  "/:id/link-expense",
  [body("expenseId").isMongoId().withMessage("Valid expense ID is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { expenseId } = req.body

      // Verify expense exists and user has access
      const expense = await Expense.findOne({
        _id: expenseId,
        $or: [{ paidBy: req.user._id }, { "splits.user": req.user._id }],
      })

      if (!expense) {
        return res.status(404).json({ message: "Expense not found or access denied" })
      }

      // Update receipt
      const receipt = await Receipt.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        {
          expenseId,
          updatedAt: new Date(),
        },
        { new: true },
      )

      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" })
      }

      // Note: Expense model stores a single receipt subdocument; we keep linkage via Receipt.expenseId

      res.json({
        message: "Receipt linked to expense successfully",
        receipt,
      })
    } catch (error) {
      console.error("Link receipt to expense error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Reprocess receipt with OCR
router.post("/:id/reprocess", async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" })
    }

    const filePath = path.join(__dirname, "..", receipt.path)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Receipt file not found" })
    }

    // Update status to processing
    await Receipt.findByIdAndUpdate(receipt._id, {
      processingStatus: "processing",
    })

    try {
      // Re-extract text using OCR
      const extractedText = await extractTextFromImage(filePath)

      // Re-parse receipt data
      const parsedData = parseReceiptData(extractedText)

      // Update receipt
      const updatedReceipt = await Receipt.findByIdAndUpdate(
        receipt._id,
        {
          extractedText,
          parsedData,
          processingStatus: "completed",
          updatedAt: new Date(),
        },
        { new: true },
      )

      res.json({
        message: "Receipt reprocessed successfully",
        receipt: updatedReceipt,
      })
    } catch (processingError) {
      // Update status to failed
      await Receipt.findByIdAndUpdate(receipt._id, {
        processingStatus: "failed",
        processingError: processingError.message,
      })

      throw processingError
    }
  } catch (error) {
    console.error("Reprocess receipt error:", error)
    res.status(500).json({ message: "Error reprocessing receipt" })
  }
})

// Delete receipt
router.delete("/:id", async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" })
    }

    // Remove file from filesystem
    const filePath = path.join(__dirname, "..", receipt.path)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // Remove receipt reference from expense if linked
    if (receipt.expenseId) {
      await Expense.findByIdAndUpdate(receipt.expenseId, {
        $pull: { receipts: receipt._id },
      })
    }

    // Delete receipt record
    await Receipt.findByIdAndDelete(receipt._id)

    res.json({ message: "Receipt deleted successfully" })
  } catch (error) {
    console.error("Delete receipt error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get receipt statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await Receipt.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: 1 },
          totalSize: { $sum: "$size" },
          linkedReceipts: {
            $sum: { $cond: [{ $ne: ["$expenseId", null] }, 1, 0] },
          },
          avgConfidence: { $avg: "$parsedData.confidence" },
        },
      },
    ])

    const recentReceipts = await Receipt.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("filename parsedData.merchant parsedData.total createdAt")

    res.json({
      stats: stats[0] || {
        totalReceipts: 0,
        totalSize: 0,
        linkedReceipts: 0,
        avgConfidence: 0,
      },
      recentReceipts,
    })
  } catch (error) {
    console.error("Get receipt stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
