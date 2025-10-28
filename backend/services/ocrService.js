const Tesseract = require("tesseract.js")

class OCRService {
  constructor() {
    this.tesseractOptions = {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    }
  }

  async extractText(imageBuffer) {
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(imageBuffer, "eng", this.tesseractOptions)

      // Parse the extracted text to find relevant information
      const parsedData = this.parseReceiptText(text)

      return {
        rawText: text,
        ...parsedData,
      }
    } catch (error) {
      console.error("OCR extraction failed:", error)
      throw new Error("Failed to extract text from image")
    }
  }

  parseReceiptText(text) {
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean)

    const result = {
      merchantName: null,
      total: null,
      subtotal: null,
      tax: null,
      date: null,
      items: [],
    }

    // Try to find merchant name (usually first few lines)
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i]
      if (line.length > 3 && !this.isNumericLine(line) && !this.isDateLine(line)) {
        result.merchantName = line
        break
      }
    }

    // Look for total, subtotal, tax
    for (const line of lines) {
      const lowerLine = line.toLowerCase()

      // Total patterns
      if (lowerLine.includes("total") && !lowerLine.includes("subtotal")) {
        const amount = this.extractAmount(line)
        if (amount && !result.total) {
          result.total = amount
        }
      }

      // Subtotal patterns
      if (lowerLine.includes("subtotal") || lowerLine.includes("sub total")) {
        const amount = this.extractAmount(line)
        if (amount) {
          result.subtotal = amount
        }
      }

      // Tax patterns
      if (lowerLine.includes("tax") && !lowerLine.includes("total")) {
        const amount = this.extractAmount(line)
        if (amount) {
          result.tax = amount
        }
      }

      // Date patterns
      const date = this.extractDate(line)
      if (date && !result.date) {
        result.date = date
      }
    }

    // Extract line items (simplified)
    result.items = this.extractLineItems(lines)

    return result
  }

  extractAmount(text) {
    // Look for currency patterns like $12.34, 12.34, $12,34
    const patterns = [
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
      /(\d{1,3}(?:,\d{3})*\.\d{2})/,
      /(\d+\.\d{2})/,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const amount = Number.parseFloat(match[1].replace(/,/g, ""))
        if (!Number.isNaN(amount) && amount > 0) {
          return amount
        }
      }
    }

    return null
  }

  extractDate(text) {
    // Common date patterns
    const patterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /(\d{1,2}-\d{1,2}-\d{2,4})/,
      /(\d{4}-\d{1,2}-\d{1,2})/,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const date = new Date(match[0])
        if (!Number.isNaN(date.getTime())) {
          return date.toISOString().split("T")[0]
        }
      }
    }

    return null
  }

  extractLineItems(lines) {
    const items = []

    for (const line of lines) {
      // Skip lines that look like headers, totals, or merchant info
      const lowerLine = line.toLowerCase()
      if (
        lowerLine.includes("total") ||
        lowerLine.includes("tax") ||
        lowerLine.includes("subtotal") ||
        lowerLine.includes("change") ||
        lowerLine.includes("cash") ||
        lowerLine.includes("card") ||
        line.length < 3
      ) {
        continue
      }

      // Look for lines with both text and amount
      const amount = this.extractAmount(line)
      if (amount) {
        // Remove the amount from the line to get the description
        const description = line.replace(/\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, "").trim()

        if (description.length > 2) {
          items.push({
            description,
            amount,
          })
        }
      }
    }

    return items.slice(0, 10) // Limit to 10 items
  }

  isNumericLine(text) {
    return /^\d+\.?\d*$/.test(text.trim())
  }

  isDateLine(text) {
    return /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text)
  }

  // Enhanced OCR with AI (placeholder for future implementation)
  async extractTextWithAI(imageBuffer) {
    // This could integrate with Google Vision API, AWS Textract, or OpenAI Vision
    // For now, fallback to Tesseract
    return this.extractText(imageBuffer)
  }
}

module.exports = OCRService