// OCR Service for receipt scanning
// Supports both client-side Tesseract.js and server-side Google Vision API

const Tesseract = require("tesseract.js")
const sharp = require("sharp")
const fs = require("fs").promises

// Google Vision API (optional)
let vision = null
try {
  vision = require("@google-cloud/vision")
} catch (error) {
  console.log("Google Vision API not available. Using Tesseract.js only.")
}

class OCRService {
  constructor(options = {}) {
    this.useGoogleVision = options.useGoogleVision && vision !== null
    this.tempDir = options.tempDir || "./temp"

    if (this.useGoogleVision) {
      this.visionClient = new vision.ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_VISION_KEY_PATH,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      })
    }

    // Ensure temp directory exists
    this.ensureTempDir()
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      console.error("Error creating temp directory:", error)
    }
  }

  // Preprocess image for better OCR accuracy
  async preprocessImage(imageBuffer) {
    try {
      const processedBuffer = await sharp(imageBuffer)
        .resize(2000, 2000, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .greyscale()
        .normalize()
        .sharpen()
        .png()
        .toBuffer()

      return processedBuffer
    } catch (error) {
      console.error("Error preprocessing image:", error)
      return imageBuffer // Return original if preprocessing fails
    }
  }

  // Extract text from image using Tesseract.js
  async extractTextTesseract(imageBuffer) {
    try {
      console.log("Starting Tesseract OCR processing...")

      // Preprocess image for better accuracy
      const processedBuffer = await this.preprocessImage(imageBuffer)

      const {
        data: { text, confidence },
      } = await Tesseract.recognize(processedBuffer, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
          }
        },
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$-: \n",
      })

      console.log(`Tesseract OCR completed with confidence: ${confidence}%`)
      return this.parseReceiptText(text, confidence)
    } catch (error) {
      console.error("Tesseract OCR error:", error)
      throw new Error("Failed to extract text from image using Tesseract")
    }
  }

  // Extract text using Google Vision API
  async extractTextGoogleVision(imageBuffer) {
    if (!this.useGoogleVision) {
      throw new Error("Google Vision API not configured")
    }

    try {
      console.log("Starting Google Vision OCR processing...")

      const [result] = await this.visionClient.textDetection({
        image: { content: imageBuffer },
      })

      const detections = result.textAnnotations
      const text = detections.length > 0 ? detections[0].description : ""

      // Calculate confidence based on detection quality
      const confidence = detections.length > 0 ? Math.min(detections[0].confidence * 100 || 85, 95) : 0

      console.log(`Google Vision OCR completed with confidence: ${confidence}%`)
      return this.parseReceiptText(text, confidence)
    } catch (error) {
      console.error("Google Vision API error:", error)
      throw new Error("Failed to extract text from image using Google Vision")
    }
  }

  // Main method to extract text (chooses between services)
  async extractText(imageBuffer) {
    if (this.useGoogleVision) {
      try {
        return await this.extractTextGoogleVision(imageBuffer)
      } catch (error) {
        console.log("Google Vision failed, falling back to Tesseract...")
        return await this.extractTextTesseract(imageBuffer)
      }
    } else {
      return await this.extractTextTesseract(imageBuffer)
    }
  }

  // Parse receipt text to extract structured data
  parseReceiptText(text, confidence = 0) {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)

    const receiptData = {
      merchantName: "",
      date: null,
      total: 0,
      subtotal: 0,
      tax: 0,
      tip: 0,
      items: [],
      rawText: text,
      confidence: confidence,
      processingMethod: this.useGoogleVision ? "google_vision" : "tesseract",
    }

    // Extract merchant name (usually first few lines)
    receiptData.merchantName = this.extractMerchantName(lines)

    // Extract date
    receiptData.date = this.extractDate(lines)

    // Extract amounts
    const amounts = this.extractAmounts(lines)
    receiptData.total = amounts.total
    receiptData.subtotal = amounts.subtotal
    receiptData.tax = amounts.tax
    receiptData.tip = amounts.tip

    // Extract line items
    receiptData.items = this.extractLineItems(lines, receiptData.total)

    return receiptData
  }

  // Extract merchant name from receipt lines
  extractMerchantName(lines) {
    // Look for merchant name in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i]

      // Skip lines that look like addresses or phone numbers
      if (line.match(/^\d+/) || line.match(/\d{3}-\d{3}-\d{4}/)) {
        continue
      }

      // Skip lines with only special characters
      if (line.match(/^[^a-zA-Z]*$/)) {
        continue
      }

      // Return first meaningful line
      if (line.length > 2 && line.length < 50) {
        return line
      }
    }

    return lines[0] || "Unknown Merchant"
  }

  // Extract date from receipt lines
  extractDate(lines) {
    const datePatterns = [
      /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
      /(\d{4}[/-]\d{1,2}[/-]\d{1,2})/,
      /(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/i,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{2,4}/i,
    ]

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern)
        if (match) {
          const dateStr = match[1] || match[0]
          const parsedDate = new Date(dateStr)
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate
          }
        }
      }
    }

    return null
  }

  // Extract various amounts from receipt
  extractAmounts(lines) {
    const amounts = {
      total: 0,
      subtotal: 0,
      tax: 0,
      tip: 0,
    }

    const amountPatterns = {
      total: /(?:total|amount|sum)[\s:]*\$?(\d+\.?\d*)/i,
      subtotal: /(?:subtotal|sub[\s-]?total)[\s:]*\$?(\d+\.?\d*)/i,
      tax: /(?:tax|hst|gst|pst)[\s:]*\$?(\d+\.?\d*)/i,
      tip: /(?:tip|gratuity)[\s:]*\$?(\d+\.?\d*)/i,
    }

    // Extract specific amounts
    for (const line of lines) {
      for (const [type, pattern] of Object.entries(amountPatterns)) {
        const match = line.match(pattern)
        if (match && !amounts[type]) {
          amounts[type] = Number.parseFloat(match[1])
        }
      }
    }

    // If no total found, look for largest amount
    if (amounts.total === 0) {
      const allAmounts = []
      const amountRegex = /\$?(\d+\.\d{2})/g

      for (const line of lines) {
        let match
        while ((match = amountRegex.exec(line)) !== null) {
          allAmounts.push(Number.parseFloat(match[1]))
        }
      }

      if (allAmounts.length > 0) {
        amounts.total = Math.max(...allAmounts)
      }
    }

    return amounts
  }

  // Extract individual line items
  extractLineItems(lines, totalAmount) {
    const items = []
    const itemPattern = /^(.+?)\s+\$?(\d+\.\d{2})$/

    for (const line of lines) {
      const match = line.match(itemPattern)
      if (match) {
        const description = match[1].trim()
        const amount = Number.parseFloat(match[2])

        // Skip if amount is too close to total (likely the total line)
        if (Math.abs(amount - totalAmount) > 0.01 && amount > 0) {
          // Clean up description
          const cleanDescription = description
            .replace(/^\d+\s*x?\s*/i, "") // Remove quantity
            .replace(/\s+/g, " ")
            .trim()

          if (cleanDescription.length > 1) {
            items.push({
              description: cleanDescription,
              amount: amount,
            })
          }
        }
      }
    }

    return items
  }

  // Validate extracted data
  validateReceiptData(receiptData) {
    const errors = []
    const warnings = []

    // Check merchant name
    if (!receiptData.merchantName || receiptData.merchantName.length < 2) {
      errors.push("Merchant name not found or too short")
    }

    // Check total amount
    if (!receiptData.total || receiptData.total <= 0) {
      errors.push("Valid total amount not found")
    }

    // Check date
    if (!receiptData.date || isNaN(receiptData.date.getTime())) {
      warnings.push("Valid date not found")
    }

    // Check if date is too far in the future or past
    if (receiptData.date) {
      const now = new Date()
      const daysDiff = Math.abs(now - receiptData.date) / (1000 * 60 * 60 * 24)

      if (daysDiff > 365) {
        warnings.push("Date seems unusually old or in the future")
      }
    }

    // Check confidence level
    if (receiptData.confidence < 50) {
      warnings.push("Low OCR confidence - results may be inaccurate")
    }

    // Check if subtotal + tax ≈ total
    if (receiptData.subtotal > 0 && receiptData.tax > 0) {
      const calculatedTotal = receiptData.subtotal + receiptData.tax + receiptData.tip
      if (Math.abs(calculatedTotal - receiptData.total) > 0.02) {
        warnings.push("Amounts don't add up correctly")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: receiptData,
    }
  }

  // Suggest expense category based on merchant name and items
  suggestCategory(merchantName, items = []) {
    const categoryKeywords = {
      food: [
        "restaurant",
        "cafe",
        "pizza",
        "burger",
        "food",
        "kitchen",
        "diner",
        "bistro",
        "grill",
        "bar",
        "pub",
        "mcdonalds",
        "subway",
        "starbucks",
        "kfc",
        "taco",
        "sushi",
        "chinese",
        "italian",
        "mexican",
        "thai",
      ],
      transportation: [
        "uber",
        "lyft",
        "taxi",
        "gas",
        "fuel",
        "parking",
        "metro",
        "bus",
        "shell",
        "exxon",
        "bp",
        "chevron",
        "mobil",
        "citgo",
        "sunoco",
      ],
      shopping: [
        "store",
        "market",
        "shop",
        "mall",
        "retail",
        "amazon",
        "target",
        "walmart",
        "costco",
        "bestbuy",
        "home depot",
        "lowes",
        "ikea",
      ],
      entertainment: [
        "cinema",
        "movie",
        "theater",
        "theatre",
        "bar",
        "club",
        "game",
        "sport",
        "gym",
        "fitness",
        "netflix",
        "spotify",
        "concert",
      ],
      utilities: [
        "electric",
        "electricity",
        "water",
        "gas",
        "internet",
        "phone",
        "cable",
        "verizon",
        "att",
        "comcast",
        "spectrum",
      ],
      healthcare: [
        "hospital",
        "clinic",
        "pharmacy",
        "medical",
        "doctor",
        "dental",
        "cvs",
        "walgreens",
        "rite aid",
        "urgent care",
      ],
      accommodation: [
        "hotel",
        "motel",
        "inn",
        "resort",
        "airbnb",
        "booking",
        "marriott",
        "hilton",
        "hyatt",
        "holiday inn",
      ],
      groceries: [
        "grocery",
        "supermarket",
        "safeway",
        "kroger",
        "publix",
        "whole foods",
        "trader joes",
        "aldi",
        "food lion",
        "giant",
      ],
    }

    const merchantLower = merchantName.toLowerCase()
    const itemsText = items
      .map((item) => item.description)
      .join(" ")
      .toLowerCase()
    const combinedText = `${merchantLower} ${itemsText}`

    // Score each category
    const categoryScores = {}
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      let score = 0
      for (const keyword of keywords) {
        if (combinedText.includes(keyword)) {
          score += keyword.length // Longer keywords get higher scores
        }
      }
      categoryScores[category] = score
    }

    // Find category with highest score
    const bestCategory = Object.entries(categoryScores).sort(([, a], [, b]) => b - a)[0]

    return bestCategory && bestCategory[1] > 0 ? bestCategory[0] : "other"
  }

  // Clean up temporary files
  async cleanup() {
    try {
      const files = await fs.readdir(this.tempDir)
      for (const file of files) {
        await fs.unlink(`${this.tempDir}/${file}`)
      }
    } catch (error) {
      console.error("Error cleaning up temp files:", error)
    }
  }
}

module.exports = OCRService
