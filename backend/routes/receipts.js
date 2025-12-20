const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { body, validationResult } = require("express-validator")
const sharp = require("sharp")
const Tesseract = require("tesseract.js")
const pdfParse = require("pdf-parse")
const Receipt = require("../models/Receipt")
const Expense = require("../models/Expense")
const OCRService = require("../services/ocrService")

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

// Helper function to extract text from uploaded file (PDF or image)
async function extractTextFromImage(filePath, mimetype) {
  try {
    // If PDF, use pdf-parse
    if (mimetype === "application/pdf" || path.extname(filePath).toLowerCase() === ".pdf") {
      const buffer = fs.readFileSync(filePath)
      const result = await pdfParse(buffer)
      return result.text || ""
    }

    // Otherwise treat as image and run through sharp + Tesseract
    const processedPath = await processImageForOCR(filePath)
    const { data: { text } } = await Tesseract.recognize(processedPath, "eng", {
      logger: (m) => {
        // Optional: inspect OCR progress here, currently a no-op to avoid noisy logs
      },
    })
    if (processedPath !== filePath && fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath)
    }
    return text
  } catch (error) {
    console.error("Error extracting text from image:", error)
    return ""
  }
}


// Upload and process receipt
router.post("/upload", upload.single("receipt"), async (req, res) => {
  try {
    console.log("Receipt upload - User:", req.user ? req.user._id : "No user")
    console.log("Receipt upload - File:", req.file ? req.file.filename : "No file")
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const receiptUrl = `/uploads/receipts/${req.file.filename}`
    const filePath = req.file.path

    // Initialize OCR service
    const ocrService = new OCRService()

    console.log("Starting OCR processing for file:", req.file.filename, "Type:", req.file.mimetype)
    console.log("DEBUG: About to process OCR")
    
    let ocrResult
    if (req.file.mimetype === "application/pdf") {
      // Handle PDF files
      const buffer = fs.readFileSync(filePath)
      const pdfResult = await pdfParse(buffer)
      const parsedData = ocrService.parseReceiptText(pdfResult.text || "")
      ocrResult = {
        rawText: pdfResult.text || "",
        ...parsedData,
      }
    } else {
      // Handle image files - use OCR service
      const imageBuffer = fs.readFileSync(filePath)
      console.log("Image buffer size:", imageBuffer.length, "bytes")
      console.log("File exists:", fs.existsSync(filePath))
      console.log("File stats:", fs.statSync(filePath))
      ocrResult = await ocrService.extractText(imageBuffer)
    }
    
    console.log("OCR extraction completed. Text length:", ocrResult.rawText ? ocrResult.rawText.length : 0)
    console.log("OCR Results - Merchant:", ocrResult.merchantName, "Total:", ocrResult.total, "Items:", ocrResult.items ? ocrResult.items.length : 0)
    console.log("OCR Raw text preview:", ocrResult.rawText ? ocrResult.rawText.substring(0, 200) + "..." : "No text")
    
    // Test parsing with known text
    if (ocrResult.rawText && ocrResult.rawText.includes("Total Payable")) {
      console.log("=== MANUAL TEST ===")
      const testLine = "Total Payable: NPR 7,011"
      console.log("Testing line:", testLine)
      const testAmount = ocrService.extractAmount(testLine)
      console.log("Manual test result:", testAmount)
      console.log("=== END TEST ===")
    }

    // Calculate confidence score
    const confidence = ocrService.calculateConfidence(ocrResult)

    // Create receipt record (align with schema fields)
    const receipt = new Receipt({
      userId: req.user._id,
      originalName: req.file.originalname,
      filename: req.file.filename,
      filePath: receiptUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ocrData: {
        rawText: ocrResult.rawText || "",
        confidence: Math.round(confidence),
        parsedData: {
          merchant: ocrResult.merchantName || undefined,
          total: ocrResult.total || undefined,
          date: ocrResult.date || undefined,
          currency: "NPR", // Update to NPR for this receipt format
          items: Array.isArray(ocrResult.items) ? ocrResult.items.map((it) => ({
            description: it.description,
            quantity: 1,
            unitPrice: it.amount || undefined,
            totalPrice: it.amount || undefined,
          })) : undefined,
          tax: ocrResult.tax || undefined,
          tip: ocrResult.tip || undefined,
          paymentMethod: undefined, // Could be enhanced to detect payment method
        },
        processingStatus: "completed",
        lastProcessedAt: new Date(),
      },
    })

    await receipt.save()

    res.json({
      success: true,
      data: {
        id: receipt._id,
        filename: receipt.filename,
        path: receipt.filePath,
        confidence: receipt.ocrData?.confidence || 0,
        parsedData: receipt.ocrData?.parsedData || {},
        extractedText: receipt.ocrData?.rawText || "",
        // Include the parsed data in the expected format for frontend
        merchant: ocrResult.merchantName || "",
        total: ocrResult.total || 0,
        date: ocrResult.date || null,
        items: ocrResult.items || [],
        tax: ocrResult.tax || 0,
        subtotal: ocrResult.subtotal || 0,
      },
    })
  } catch (error) {
    console.error("Error processing receipt:", error)
    res.status(500).json({ message: "Error processing receipt", error: error.message })
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
    
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
