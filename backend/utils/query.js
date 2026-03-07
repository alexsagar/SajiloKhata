function clampInt(value, { min, max, fallback }) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function getPagination(query, { defaultLimit = 20, maxLimit = 200 } = {}) {
  const page = clampInt(query.page, { min: 1, max: 1_000_000, fallback: 1 })
  const limit = clampInt(query.limit, { min: 1, max: maxLimit, fallback: defaultLimit })
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

function escapeRegex(raw = "") {
  return String(raw).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

module.exports = {
  clampInt,
  getPagination,
  escapeRegex,
}
