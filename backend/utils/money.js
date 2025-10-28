function toCents(value) {
  const num = typeof value === "string" ? Number.parseFloat(value) : Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100)
}

function fromCents(cents) {
  const num = Number(cents)
  if (!Number.isFinite(num)) return 0
  return Math.round(num) / 100
}

function roundToTwo(value) {
  return fromCents(toCents(value))
}

module.exports = { toCents, fromCents, roundToTwo }


