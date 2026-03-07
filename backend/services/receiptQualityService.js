const crypto = require("crypto")
const Receipt = require("../models/Receipt")

function toDayKey(dateValue) {
  if (!dateValue) return "unknown-date"
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return "unknown-date"
  return d.toISOString().slice(0, 10)
}

function makeFingerprint({ merchantCanonical, total, date, itemsCount, currency, fileSize }) {
  const normalizedTotal = Number.isFinite(Number(total)) ? Number(total).toFixed(2) : "no-total"
  const raw = [
    merchantCanonical || "unknown-merchant",
    normalizedTotal,
    toDayKey(date),
    Number(itemsCount || 0),
    (currency || "USD").toUpperCase(),
    Number(fileSize || 0),
  ].join("|")
  return crypto.createHash("sha256").update(raw).digest("hex")
}

async function detectDuplicate({ userId, receiptId, fingerprint }) {
  if (!fingerprint) return { isDuplicate: false, duplicateOf: null, matchScore: 0 }
  const duplicate = await Receipt.findOne({
    _id: { $ne: receiptId },
    userId,
    "ocrData.duplicateDetection.fingerprint": fingerprint,
  })
    .sort({ createdAt: -1 })
    .select("_id")
    .lean()

  if (!duplicate) return { isDuplicate: false, duplicateOf: null, matchScore: 0 }
  return { isDuplicate: true, duplicateOf: duplicate._id, matchScore: 1 }
}

function computeReviewFlags({ confidence, parsedData, duplicateDetection, linkedExpenseAmount }) {
  const reasons = []
  const parsed = parsedData || {}
  const score = Number(confidence || 0)

  if (score < Number(process.env.OCR_REVIEW_CONFIDENCE_THRESHOLD || 70)) {
    reasons.push("low_confidence")
  }
  if (!parsed.merchant) reasons.push("missing_merchant")
  if (!Number.isFinite(Number(parsed.total || NaN))) reasons.push("missing_total")
  if (!parsed.date) reasons.push("missing_date")
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) reasons.push("no_items")
  if (duplicateDetection?.isDuplicate) reasons.push("possible_duplicate")

  if (
    Number.isFinite(Number(linkedExpenseAmount)) &&
    Number.isFinite(Number(parsed.total)) &&
    Math.abs(Number(parsed.total) - Number(linkedExpenseAmount)) > Number(process.env.OCR_MISMATCH_TOLERANCE || 10)
  ) {
    reasons.push("amount_mismatch")
  }

  return {
    requiresReview: reasons.length > 0,
    reviewReasons: reasons,
  }
}

module.exports = {
  makeFingerprint,
  detectDuplicate,
  computeReviewFlags,
}
