const mongoose = require("mongoose")

const receiptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    ocrData: {
      rawText: String,
      confidence: {
        type: Number,
        min: 0,
        max: 100,
      },
      parsedData: {
        merchant: String,
        total: Number,
        date: Date,
        currency: String,
        items: [
          {
            description: String,
            quantity: Number,
            unitPrice: Number,
            totalPrice: Number,
          },
        ],
        tax: Number,
        tip: Number,
        paymentMethod: String,
      },
      processingStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
      },
      processingError: String,
      lastProcessedAt: Date,
    },
    metadata: {
      imageWidth: Number,
      imageHeight: Number,
      colorSpace: String,
      hasAlpha: Boolean,
    },
    tags: [String],
    isLinkedToExpense: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
receiptSchema.index({ userId: 1 })
receiptSchema.index({ expenseId: 1 })
receiptSchema.index({ createdAt: -1 })
receiptSchema.index({ "ocrData.processingStatus": 1 })
receiptSchema.index({ isLinkedToExpense: 1 })

// Virtual for file URL
receiptSchema.virtual("fileUrl").get(function () {
  return `/uploads/receipts/${this.filename}`
})

// Method to check if OCR processing is complete
receiptSchema.methods.isOcrComplete = function () {
  return this.ocrData.processingStatus === "completed"
}

// Method to get processing summary
receiptSchema.methods.getProcessingSummary = function () {
  return {
    status: this.ocrData.processingStatus,
    confidence: this.ocrData.confidence,
    hasData: !!this.ocrData.parsedData.merchant,
    lastProcessed: this.ocrData.lastProcessedAt,
    error: this.ocrData.processingError,
  }
}

module.exports = mongoose.model("Receipt", receiptSchema)
