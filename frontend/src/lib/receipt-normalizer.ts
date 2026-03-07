export type NormalizedReceiptItem = {
  description: string
  quantity?: number
  unitPrice?: number
  totalPrice?: number
}

export type NormalizedReceiptData = {
  merchant: string | null
  total: number | null
  currency: string | null
  date: string | null
  items: NormalizedReceiptItem[]
}

function toNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function toCurrencyCode(value: unknown): string | null {
  if (!value) return null
  const code = String(value).trim().toUpperCase()
  return /^[A-Z]{3}$/.test(code) ? code : null
}

function toDateInputValue(value: unknown): string | null {
  if (!value) return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().split("T")[0]
}

function computeBestEffortTotal(raw: Record<string, unknown> | null | undefined, items: NormalizedReceiptItem[]): number | null {
  const explicitTotal = toNumber(raw?.total)
  if (explicitTotal) return explicitTotal

  const subtotalFromField = toNumber(raw?.subtotal)
  const subtotalFromItems = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 1)
    const line = toNumber(item.totalPrice) ?? toNumber(item.unitPrice)
    if (!line) return sum
    return sum + line * (Number.isFinite(qty) && qty > 0 ? qty : 1)
  }, 0)
  const subtotal = subtotalFromField ?? (subtotalFromItems > 0 ? subtotalFromItems : null)
  if (!subtotal) return null

  const discount = toNumber(raw?.discount) ?? 0
  const serviceCharge = toNumber(raw?.serviceCharge) ?? 0
  const vat = toNumber(raw?.vat) ?? 0
  const tax = toNumber(raw?.tax) ?? 0
  const taxPart = vat > 0 && tax > 0 && Math.abs(vat - tax) < 0.01 ? vat : vat + tax

  const computed = subtotal - discount + serviceCharge + taxPart
  return computed > 0 ? Number(computed.toFixed(2)) : null
}

export function normalizeReceiptParsedData(raw: Record<string, unknown> | null | undefined): NormalizedReceiptData {
  const items: NormalizedReceiptItem[] = []
  if (Array.isArray(raw?.items)) {
    for (const item of raw.items) {
      if (!item || typeof item !== "object") continue
      const source = item as Record<string, unknown>
      const description = String(source.description || "").trim() || "Item"
      const quantity = toNumber(source.quantity) ?? 1
      const unitPrice = toNumber(source.unitPrice ?? source.amount)
      const totalPrice = toNumber(source.totalPrice ?? source.amount)

      items.push({
        description,
        quantity,
        unitPrice: unitPrice ?? undefined,
        totalPrice: totalPrice ?? undefined,
      })
    }
  }

  const merchantRaw = raw?.merchant ?? raw?.merchantName ?? null
  const merchant = merchantRaw ? String(merchantRaw).trim() || null : null

  return {
    merchant,
    total: computeBestEffortTotal(raw, items),
    currency: toCurrencyCode(raw?.currency),
    date: toDateInputValue(raw?.date),
    items,
  }
}

function formatAmountForNotes(amount: number): string {
  if (Number.isInteger(amount)) return String(amount)
  return amount.toFixed(2)
}

export function formatReceiptItemsToNotes(items: NormalizedReceiptItem[], currencyCode: string): string {
  if (!Array.isArray(items) || items.length === 0) return ""

  return items
    .map((item) => {
      const description = String(item.description || "Item").trim() || "Item"
      const quantity = Number(item.quantity || 1)
      const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
      const amount = toNumber(item.totalPrice) ?? toNumber(item.unitPrice)
      const amountText = amount ? `${currencyCode} ${formatAmountForNotes(amount)}` : `${currencyCode} 0`
      return `${description} x${qty}  ${amountText}`
    })
    .join("\n")
}
