import Invoice from '../models/Invoice.js'
import EarningHistory from '../models/EarningHistory.js'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function archiveExpiredInvoices() {
  const expired = await Invoice.aggregate([
    { $match: { expiresAt: { $lte: new Date() } } },
    {
      $group: {
        _id: {
          driverId: '$driverId',
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        },
        totalRides: { $sum: 1 },
        totalEarnings: { $sum: '$totals.total' },
        averageFare: { $avg: '$totals.total' },
        paymentMethods: { $push: '$paymentMode' },
      },
    },
  ])

  for (const summary of expired) {
    const paymentMethods = summary.paymentMethods.reduce((counts, method) => {
      const key = method || 'Unknown'
      counts[key] = (counts[key] || 0) + 1
      return counts
    }, {})
    await EarningHistory.findOneAndUpdate(
      {
        driverId: summary._id.driverId,
        month: MONTHS[summary._id.month - 1],
        year: summary._id.year,
      },
      {
        $set: {
          totalRides: summary.totalRides,
          totalEarnings: summary.totalEarnings,
          averageFare: summary.averageFare || 0,
          paymentMethods,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true },
    )
  }

  if (expired.length) await Invoice.deleteMany({ expiresAt: { $lte: new Date() } })
}

export { MONTHS }