const OCRService = require("../services/ocrService")

describe("OCRService.parseReceiptText", () => {
  test("extracts subtotal/discount/service charge/vat/total from multiline receipt", () => {
    const service = new OCRService()
    const text = [
      "Fashion Store",
      "Subtotal",
      "NPR 6,000.00",
      "Discount 5%",
      "NPR 300.00",
      "Service Charge 10%",
      "NPR 570.00",
      "VAT 13%",
      "NPR 741.00",
      "Total Payable",
      "NPR 7,011.00",
      "T-Shirt 1 800",
      "Jeans 1 2,200",
      "Jacket 1 3,000",
    ].join("\n")

    const parsed = service.parseReceiptText(text)

    expect(parsed.subtotal).toBe(6000)
    expect(parsed.discount).toBe(300)
    expect(parsed.serviceCharge).toBe(570)
    expect(parsed.vat).toBe(741)
    expect(parsed.tax).toBe(741)
    expect(parsed.total).toBe(7011)
    expect(parsed.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ description: "T-Shirt", amount: 800 }),
        expect.objectContaining({ description: "Jeans", amount: 2200 }),
        expect.objectContaining({ description: "Jacket", amount: 3000 }),
      ]),
    )
  })

  test("corrects noisy amounts using percentage reconciliation", () => {
    const service = new OCRService()
    const text = [
      "Fashion Store",
      "Subtotal NPR 6,000.00",
      "Discount 5% NPR 570.00",
      "Service Charge 10% NPR 741.00",
      "VAT 13% NPR 7,011.00",
      "Total NPR 13,182.00",
      "T-Shirt 1 800",
      "Jeans 1 2,200",
      "Jacket 1 3,000",
    ].join("\n")

    const parsed = service.parseReceiptText(text)

    expect(parsed.subtotal).toBe(6000)
    expect(parsed.discount).toBe(300)
    expect(parsed.serviceCharge).toBe(570)
    expect(parsed.vat).toBe(741)
    expect(parsed.tax).toBe(741)
    expect(parsed.total).toBe(7011)
  })
})
