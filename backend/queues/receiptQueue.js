const path = require("path")
const fs = require("fs/promises")
const Queue = require("bull")
const pdfParse = require("pdf-parse")
const Receipt = require("../models/Receipt")
const Expense = require("../models/Expense")
const OCRService = require("../services/ocrService")
const notificationService = require("../services/notificationService")
const { learnAndResolveMerchant } = require("../services/merchantLearningService")
const { makeFingerprint, detectDuplicate, computeReviewFlags } = require("../services/receiptQualityService")

const REDIS_URL = process.env.REDIS_URL
let receiptQueue = null

if (!REDIS_URL) {
  console.warn("[ReceiptQueue] REDIS_URL not configured - receipt processing queue disabled")
} else {
  try {
    receiptQueue = new Queue("receipt-processing", REDIS_URL, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })

    receiptQueue.on("ready", () => {
      console.log("[ReceiptQueue] Connected to Redis")
    })

    receiptQueue.once("error", (err) => {
      console.error("[ReceiptQueue] Redis connection error:", err.message)
      receiptQueue = null
    })
  } catch (err) {
    console.error("[ReceiptQueue] Could not initialize queue:", err.message)
    receiptQueue = null
  }
}

async function processReceiptJob(job) {
  const { receiptId } = job.data
  const receipt = await Receipt.findById(receiptId)
  if (!receipt) return { receiptId, skipped: true }

  await Receipt.updateOne(
    { _id: receipt._id },
    {
      $set: {
        "ocrData.processingStatus": "processing",
        "ocrData.processingError": null,
      },
    },
  )

  const ocrService = new OCRService()

  try {
    const relativePath = String(receipt.filePath || "").replace(/^[/\\]+/, "")
    const absolutePath = path.join(__dirname, "..", relativePath)
    const buffer = await fs.readFile(absolutePath)

    let parsed
    if (receipt.mimeType === "application/pdf" || absolutePath.toLowerCase().endsWith(".pdf")) {
      const pdfResult = await pdfParse(buffer)
      parsed = {
        rawText: pdfResult.text || "",
        ...ocrService.parseReceiptText(pdfResult.text || ""),
      }
    } else {
      parsed = await ocrService.extractText(buffer)
    }

    const confidence = ocrService.calculateConfidence(parsed)
    const merchantLearning = await learnAndResolveMerchant(receipt.userId, parsed.merchantName || "")

    let linkedExpenseAmount = null
    if (receipt.expenseId) {
      const linked = await Expense.findById(receipt.expenseId).select("amountCents").lean()
      if (linked) linkedExpenseAmount = Number(linked.amountCents || 0) / 100
    }

    const parsedData = {
      merchant: merchantLearning.canonicalName || parsed.merchantName || null,
      merchantCanonical: merchantLearning.normalizedName || null,
      total: parsed.total || null,
      subtotal: parsed.subtotal || null,
      discount: parsed.discount || null,
      serviceCharge: parsed.serviceCharge || null,
      vat: parsed.vat || null,
      date: parsed.date ? new Date(parsed.date) : null,
      currency: receipt.ocrData?.parsedData?.currency || "USD",
      items: Array.isArray(parsed.items)
        ? parsed.items.map((it) => ({
          description: it.description,
          quantity: 1,
          unitPrice: it.amount || null,
          totalPrice: it.amount || null,
        }))
        : [],
      tax: parsed.tax || null,
      tip: parsed.tip || null,
      paymentMethod: null,
    }
    const fingerprint = makeFingerprint({
      merchantCanonical: parsedData.merchantCanonical,
      total: parsedData.total,
      date: parsedData.date,
      itemsCount: parsedData.items.length,
      currency: parsedData.currency,
      fileSize: receipt.fileSize,
    })
    const duplicateDetection = await detectDuplicate({
      userId: receipt.userId,
      receiptId: receipt._id,
      fingerprint,
    })
    const review = computeReviewFlags({
      confidence,
      parsedData,
      duplicateDetection,
      linkedExpenseAmount,
    })

    await Receipt.updateOne(
      { _id: receipt._id },
      {
        $set: {
          "ocrData.rawText": parsed.rawText || "",
          "ocrData.confidence": Math.round(confidence),
          "ocrData.parsedData": parsedData,
          "ocrData.processingStatus": "completed",
          "ocrData.processingError": null,
          "ocrData.lastProcessedAt": new Date(),
          "ocrData.requiresReview": review.requiresReview,
          "ocrData.reviewReasons": review.reviewReasons,
          "ocrData.reviewedAt": null,
          "ocrData.reviewedByUser": false,
          "ocrData.duplicateDetection": {
            isDuplicate: duplicateDetection.isDuplicate,
            duplicateOf: duplicateDetection.duplicateOf || null,
            fingerprint,
            matchScore: duplicateDetection.matchScore || 0,
            checkedAt: new Date(),
          },
        },
      },
    )

    const detectedTotal = typeof parsed.total === "number" ? parsed.total : null
    await notificationService.createNotification({
      userId: receipt.userId,
      type: "RECEIPT_OCR_COMPLETED",
      title: "Receipt scan completed",
      message: detectedTotal != null
        ? `Receipt scanned successfully. Detected total ${detectedTotal}.`
        : "Receipt scanned successfully.",
      entityType: "receipt",
      entityId: receipt._id,
      data: {
        receiptId: String(receipt._id),
        total: detectedTotal,
        actionUrl: `/expenses`,
      },
      actionUrl: "/expenses",
    })

    if (review.requiresReview) {
      await notificationService.createNotification({
        userId: receipt.userId,
        type: "RECEIPT_OCR_COMPLETED",
        title: "Receipt needs review",
        message: `Receipt parsed but needs review: ${review.reviewReasons.join(", ")}.`,
        entityType: "receipt",
        entityId: receipt._id,
        data: {
          receiptId: String(receipt._id),
          reviewReasons: review.reviewReasons,
          actionUrl: "/expenses",
        },
        actionUrl: "/expenses",
      })
    }

    if (receipt.expenseId && detectedTotal != null) {
      const linkedExpense = await Expense.findById(receipt.expenseId).select("amountCents").lean()
      if (linkedExpense) {
        const expenseAmount = Number(linkedExpense.amountCents || 0) / 100
        if (Math.abs(expenseAmount - detectedTotal) > 10) {
          await notificationService.createNotification({
            userId: receipt.userId,
            type: "RECEIPT_AMOUNT_MISMATCH",
            title: "Receipt amount mismatch",
            message: `Receipt total ${detectedTotal} differs from expense ${expenseAmount}.`,
            entityType: "receipt",
            entityId: receipt._id,
            data: {
              receiptId: String(receipt._id),
              expenseId: String(receipt.expenseId),
              receiptTotal: detectedTotal,
              expenseTotal: expenseAmount,
              tolerance: 10,
              actionUrl: `/expenses/${receipt.expenseId}`,
            },
            actionUrl: `/expenses/${receipt.expenseId}`,
          })
        }
      }
    }

    return { receiptId, processed: true }
  } catch (err) {
    await Receipt.updateOne(
      { _id: receipt._id },
      {
        $set: {
          "ocrData.processingStatus": "failed",
          "ocrData.processingError": err.message,
          "ocrData.lastProcessedAt": new Date(),
        },
      },
    )
    await notificationService.createNotification({
      userId: receipt.userId,
      type: "RECEIPT_OCR_FAILED",
      title: "Receipt scan failed",
      message: "We could not process this receipt. Tap to retry.",
      entityType: "receipt",
      entityId: receipt._id,
      data: {
        receiptId: String(receipt._id),
        error: err.message,
        actionUrl: "/expenses",
      },
      actionUrl: "/expenses",
    })
    throw err
  }
}

if (receiptQueue) {
  receiptQueue.process(2, processReceiptJob)
}

function isReceiptQueueAvailable() {
  return Boolean(receiptQueue)
}

async function enqueueReceiptProcessing(jobData) {
  if (!receiptQueue) {
    const err = new Error("Receipt queue unavailable")
    err.code = "QUEUE_UNAVAILABLE"
    throw err
  }
  return receiptQueue.add(jobData)
}

module.exports = {
  enqueueReceiptProcessing,
  isReceiptQueueAvailable,
  receiptQueue,
}
