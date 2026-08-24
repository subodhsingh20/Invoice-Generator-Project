export function calculateInvoiceTotals({ fare = 0, gst = 0, discount = 0 }) {
  const baseFare = toNonNegativeNumber(fare)
  const gstRate = toNonNegativeNumber(gst)
  const discountRate = toNonNegativeNumber(discount)
  const gstAmount = (baseFare * gstRate) / 100
  const discountAmount = (baseFare * discountRate) / 100

  return {
    baseFare,
    gstRate,
    gstAmount,
    discountRate,
    discountAmount,
    total: Math.max(0, baseFare + gstAmount - discountAmount),
  }
}

function toNonNegativeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}