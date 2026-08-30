import { Router } from 'express'
import Invoice from '../models/Invoice.js'
import requireDriver from '../middleware/requireDriver.js'

const router = Router()

router.get('/', requireDriver, async (request, response) => {
  try {
    const filter = buildReportFilter(request.query, request.user.driverId)

    const [summary] = await Invoice.aggregate([
      { $match: filter },
      { $group: { _id: null, invoiceCount: { $sum: 1 }, totalFare: { $sum: '$totals.baseFare' }, totalGst: { $sum: '$totals.gstAmount' }, totalDiscount: { $sum: '$totals.discountAmount' }, totalCollected: { $sum: '$totals.total' } } },
    ])

    const [daily, weekly, monthly] = await Promise.all([
      Invoice.aggregate(buildSeriesPipeline(filter, { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } })),
      Invoice.aggregate(buildSeriesPipeline(filter, { $dateToString: { format: '%G-W%V', date: '$createdAt' } })),
      Invoice.aggregate(buildSeriesPipeline(filter, { $dateToString: { format: '%Y-%m', date: '$createdAt' } })),
    ])

    return response.json({
      from: request.query.from || null,
      to: request.query.to || null,
      invoiceCount: summary?.invoiceCount || 0,
      totalFare: summary?.totalFare || 0,
      totalGst: summary?.totalGst || 0,
      totalDiscount: summary?.totalDiscount || 0,
      totalCollected: summary?.totalCollected || 0,
      daily,
      weekly,
      monthly,
    })
  } catch {
    return response.status(500).json({ error: 'Unable to generate report' })
  }
})

function buildReportFilter(query, driverId) {
  const filter = { driverId: String(driverId) }
  if (query.from || query.to) {
    filter.createdAt = {}
    if (query.from) filter.createdAt.$gte = parseDate(query.from, 'Invalid from date')
    if (query.to) {
      const end = parseDate(query.to, 'Invalid to date')
      end.setHours(23, 59, 59, 999)
      filter.createdAt.$lte = end
    }
  }
  return filter
}

function buildSeriesPipeline(filter, period) {
  return [
    { $match: filter },
    { $group: { _id: period, earnings: { $sum: '$totals.total' }, trips: { $sum: 1 } } },
    { $project: { _id: 0, period: '$_id', earnings: 1, trips: 1 } },
    { $sort: { period: 1 } },
  ]
}

function parseDate(value, message) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    const error = new Error(message)
    error.statusCode = 400
    throw error
  }
  return date
}

export default router
