import { Router } from 'express'
import Invoice from '../models/Invoice.js'

const router = Router()

router.get('/', async (request, response) => {
  try {
    const filter = {}
    if (request.query.from || request.query.to) {
      filter.createdAt = {}
      if (request.query.from) filter.createdAt.$gte = new Date(request.query.from)
      if (request.query.to) filter.createdAt.$lte = new Date(request.query.to)
    }

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

function buildSeriesPipeline(filter, period) {
  return [
    { $match: filter },
    { $group: { _id: period, earnings: { $sum: '$totals.total' }, trips: { $sum: 1 } } },
    { $project: { _id: 0, period: '$_id', earnings: 1, trips: 1 } },
    { $sort: { period: 1 } },
  ]
}

export default router