import { Router } from 'express'
import EarningHistory from '../models/EarningHistory.js'
import requireDriver from '../middleware/requireDriver.js'
import { MONTHS } from '../utils/earningHistory.js'

const router = Router()

router.use(requireDriver)

router.get('/month/:month/:year', async (request, response) => {
  const month = normalizeMonth(request.params.month)
  const year = Number(request.params.year)
  if (!month || !validYear(year)) return response.status(400).json({ error: 'A valid month and year are required' })
  const summary = await EarningHistory.findOne({ driverId: String(request.user.driverId), month, year }).lean()
  return response.json(summary || emptySummary(month, year))
})

router.get('/year/:year', async (request, response) => {
  const year = Number(request.params.year)
  if (!validYear(year)) return response.status(400).json({ error: 'A valid year is required' })
  const summaries = await EarningHistory.find({ driverId: String(request.user.driverId), year }).sort({ createdAt: 1 }).lean()
  return response.json(combineYear(summaries, year))
})

router.get('/history', async (request, response) => {
  const driverId = String(request.user.driverId)
  const [monthly, yearly] = await Promise.all([
    EarningHistory.find({ driverId }).sort({ year: -1, createdAt: -1 }).lean(),
    EarningHistory.aggregate([
      { $match: { driverId } },
      { $group: { _id: '$year', totalRides: { $sum: '$totalRides' }, totalEarnings: { $sum: '$totalEarnings' }, averageFare: { $avg: '$averageFare' }, paymentMethods: { $push: '$paymentMethods' } } },
      { $project: { _id: 0, year: '$_id', totalRides: 1, totalEarnings: 1, averageFare: 1, paymentMethods: 1 } },
      { $sort: { year: -1 } },
    ]),
  ])
  return response.json({ monthly, yearly })
})

function normalizeMonth(value) {
  return MONTHS.find((month) => month.toLowerCase() === String(value).toLowerCase())
}

function validYear(year) {
  return Number.isInteger(year) && year >= 2024 && year <= 2030
}

function emptySummary(month, year) {
  return { month, year, totalRides: 0, totalEarnings: 0, averageFare: 0, paymentMethods: {} }
}

function combineYear(summaries, year) {
  const totalRides = summaries.reduce((total, summary) => total + summary.totalRides, 0)
  const totalEarnings = summaries.reduce((total, summary) => total + summary.totalEarnings, 0)
  const paymentMethods = summaries.reduce((totals, summary) => {
    for (const methodGroup of summary.paymentMethods || []) {
      for (const [method, count] of Object.entries(methodGroup || {})) totals[method] = (totals[method] || 0) + count
    }
    return totals
  }, {})
  return { year, totalRides, totalEarnings, averageFare: totalRides ? totalEarnings / totalRides : 0, paymentMethods, months: summaries }
}

export default router