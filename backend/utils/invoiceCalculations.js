export function calculateInvoiceTotals({ fare = 0, discount = 0 }) {
  const baseFare = toNonNegativeNumber(fare)
  const discountAmount = Math.min(baseFare, toNonNegativeNumber(discount))

  return {
    baseFare,
    discountAmount,
    total: baseFare - discountAmount,
  }
}

function toNonNegativeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}
