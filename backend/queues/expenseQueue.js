/**
 * Expense processing queue - handles OCR and notification fan-out
 * asynchronously so POST /expenses returns fast.
 */
const Queue = require('bull')
const OCRService = require('../services/ocrService')
const { createNotification } = require('../services/notificationService')
const Expense = require('../models/Expense')

const REDIS_URL = process.env.REDIS_URL
let expenseQueue = null

if (!REDIS_URL) {
  console.warn('[ExpenseQueue] REDIS_URL not configured - async processing disabled')
} else {
  try {
    expenseQueue = new Queue('expense-processing', REDIS_URL, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })

    expenseQueue.on('ready', () => {
      console.log('[ExpenseQueue] Connected to Redis')
    })

    expenseQueue.once('error', (err) => {
      console.error('[ExpenseQueue] Redis connection error (disabling Redis):', err.message)
      expenseQueue = null
    })

    expenseQueue.on('failed', (job, err) => {
      console.error(`[ExpenseQueue] Job ${job.id} failed:`, err.message)
    })
  } catch (err) {
    console.warn('[ExpenseQueue] Could not connect to Redis - async processing disabled:', err.message)
    expenseQueue = null
  }
}

async function processExpenseJob(job) {
  const { expenseId, receiptBuffer, notifications } = job.data
  const timings = { ocr: 0, notifications: 0 }

  if (receiptBuffer && receiptBuffer.length > 0) {
    const start = Date.now()
    try {
      const buffer = Buffer.from(receiptBuffer)
      const ocr = new OCRService()
      const ocrResult = await ocr.processReceipt(buffer)

      await Expense.findByIdAndUpdate(expenseId, {
        'receipt.ocrData': ocrResult.data,
        'receipt.ocrConfidence': ocrResult.confidence,
        'receipt.ocrProcessedAt': new Date(),
      })
    } catch (err) {
      console.error(`[ExpenseQueue] OCR failed for ${expenseId}:`, err.message)
    }
    timings.ocr = Date.now() - start
  }

  if (notifications && notifications.length > 0) {
    const start = Date.now()
    for (const n of notifications) {
      try {
        await createNotification(n)
      } catch (err) {
        console.error(`[ExpenseQueue] Notification failed for user ${n.userId}:`, err.message)
      }
    }
    timings.notifications = Date.now() - start
  }

  console.log(`[ExpenseQueue] Job ${job.id} done for expense ${expenseId} - OCR ${timings.ocr}ms, Notifs ${timings.notifications}ms`)
  return { expenseId, timings }
}

if (expenseQueue) {
  expenseQueue.process(2, processExpenseJob)
}

function isExpenseQueueAvailable() {
  return Boolean(expenseQueue)
}

async function enqueueExpenseProcessing(jobData) {
  if (!expenseQueue) {
    const err = new Error('Expense queue unavailable')
    err.code = 'QUEUE_UNAVAILABLE'
    throw err
  }
  return expenseQueue.add(jobData)
}

module.exports = { enqueueExpenseProcessing, isExpenseQueueAvailable, expenseQueue }
