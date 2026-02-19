/**
 * Expense processing queue — handles OCR and notification fan-out
 * asynchronously so POST /expenses returns fast.
 *
 * Uses Bull backed by Redis.  Falls back gracefully if Redis is
 * unavailable (processes inline with a warning).
 */
const Queue = require('bull')
const OCRService = require('../services/ocrService')
const { createNotification } = require('../services/notificationService')
const Expense = require('../models/Expense')
const { fromCents } = require('../utils/money')

// ---------- queue setup ----------

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

let expenseQueue

try {
    expenseQueue = new Queue('expense-processing', REDIS_URL, {
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,   // keep last 100 completed jobs
            removeOnFail: 200,       // keep last 200 failed jobs
        },
    })

    expenseQueue.on('error', (err) => {
        console.error('[ExpenseQueue] Redis connection error:', err.message)
    })

    expenseQueue.on('failed', (job, err) => {
        console.error(`[ExpenseQueue] Job ${job.id} failed:`, err.message)
    })

    console.log('[ExpenseQueue] Connected to Redis')
} catch (err) {
    console.warn('[ExpenseQueue] Could not connect to Redis — async processing disabled:', err.message)
    expenseQueue = null
}

// ---------- processor ----------

/**
 * Job data shape:
 * {
 *   expenseId: string,
 *   receiptBuffer?: number[] (from Buffer),
 *   receiptMeta?: { filename, originalName, mimetype, size },
 *   notifications?: Array<{ userId, type, title, message, data }>,
 *   socketRoom?: string,      // e.g. "group_<id>"
 *   socketEvent?: string,     // e.g. "expense_added"
 * }
 */
async function processExpenseJob(job) {
    const { expenseId, receiptBuffer, receiptMeta, notifications } = job.data
    const timings = { ocr: 0, notifications: 0 }

    // 1. OCR enrichment
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
            // Non-fatal — expense already saved without OCR
        }
        timings.ocr = Date.now() - start
    }

    // 2. Notification fan-out
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

    console.log(`[ExpenseQueue] Job ${job.id} done for expense ${expenseId} — OCR ${timings.ocr}ms, Notifs ${timings.notifications}ms`)
    return { expenseId, timings }
}

// Register processor if queue is available
if (expenseQueue) {
    expenseQueue.process(2, processExpenseJob) // concurrency: 2
}

// ---------- public API ----------

/**
 * Enqueue an expense-processing job.
 * If Redis is unavailable, processes synchronously (slower but correct).
 */
async function enqueueExpenseProcessing(jobData) {
    if (expenseQueue) {
        return expenseQueue.add(jobData)
    }

    // Fallback: inline processing
    console.warn('[ExpenseQueue] Processing inline (Redis unavailable)')
    try {
        await processExpenseJob({ data: jobData, id: 'inline-' + Date.now() })
    } catch (err) {
        console.error('[ExpenseQueue] Inline processing error:', err.message)
    }
}

module.exports = { enqueueExpenseProcessing, expenseQueue }
