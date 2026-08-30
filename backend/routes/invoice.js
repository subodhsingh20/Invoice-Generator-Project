import { Router } from 'express'
import PDFDocument from 'pdfkit'
import Invoice from '../models/Invoice.js'
import { calculateInvoiceTotals } from '../utils/invoiceCalculations.js'
import requireDriver from '../middleware/requireDriver.js'

const router = Router()
const requiredFields = ['passengerName', 'driverName', 'vehicleNumber', 'pickup', 'drop', 'distance', 'fare']

router.get('/:id/pdf', requireDriver, async (request, response) => {
  try {
    const invoice = await Invoice.findById(request.params.id)
    if (!invoice) return response.status(404).json({ error: 'Invoice not found' })
    if (invoice.driverId && invoice.driverId !== String(request.user.driverId)) {
      return response.status(403).json({ error: 'You do not have access to this invoice' })
    }

    const doc = new PDFDocument({ margin: 50 })
    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader('Content-Disposition', `attachment; filename="easy-bill-${invoice.passengerName || 'invoice'}.pdf"`)
    doc.pipe(response)

    doc.fontSize(22).text('Journey Invoice', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(12)
    doc.text(`Passenger: ${invoice.passengerName || 'Not added'}`)
    doc.text(`Driver: ${invoice.driverName || 'Not added'}`)
    doc.text(`Vehicle: ${invoice.vehicleNumber || 'Not added'}`)
    doc.text(`From: ${invoice.pickup || 'Not added'}`)
    doc.text(`To: ${invoice.drop || 'Not added'}`)
    doc.text(`Distance: ${invoice.distance} km`)
    doc.text(`Payment: ${invoice.paymentMode || 'Cash'}`)
    doc.moveDown(0.5)
    const total = Number(invoice.totals?.total || 0)
    doc.fontSize(16).text(`Total: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)}`, { align: 'right' })
    doc.end()
  } catch (error) {
    if (error.name === 'CastError') return response.status(400).json({ error: 'Invalid invoice id' })
    if (!response.headersSent) return response.status(500).json({ error: 'Unable to generate PDF' })
  }
})

router.get('/', requireDriver, async (request, response) => {
  try {
    const filter = buildListFilter(request.query, request.user.driverId)
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 })
    return response.json(invoices)
  } catch (error) {
    if (error.statusCode) return response.status(error.statusCode).json({ error: error.message })
    return response.status(500).json({ error: 'Unable to fetch invoices' })
  }
})

router.get('/list', requireDriver, async (request, response) => {
  try {
    const filter = buildListFilter(request.query, request.user.driverId)
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 })
    return response.json(invoices)
  } catch (error) {
    if (error.statusCode) return response.status(error.statusCode).json({ error: error.message })
    return response.status(500).json({ error: 'Unable to fetch invoices' })
  }
})

router.get('/:id', requireDriver, async (request, response) => {
  try {
    const invoice = await Invoice.findById(request.params.id)
    if (!invoice) return response.status(404).json({ error: 'Invoice not found' })
    if (invoice.driverId && invoice.driverId !== String(request.user.driverId)) {
      return response.status(403).json({ error: 'You do not have access to this invoice' })
    }
    return response.json(formatInvoice(invoice))
  } catch (error) {
    if (error.name === 'CastError') return response.status(400).json({ error: 'Invalid invoice id' })
    return response.status(500).json({ error: 'Unable to fetch invoice' })
  }
})

router.post('/', requireDriver, async (request, response) => {
  try {
    const missingFields = requiredFields.filter((field) => request.body[field] === undefined || request.body[field] === '')
    if (missingFields.length > 0) {
      return response.status(400).json({ error: 'Missing required invoice fields', fields: missingFields })
    }

    const totals = calculateInvoiceTotals(request.body)
    const invoice = await Invoice.create({
      ...request.body,
      driverId: String(request.user.driverId),
      paymentMode: request.body.paymentMode || 'Cash',
      totals,
    })
    return response.status(201).json(formatInvoice(invoice))
  } catch (error) {
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: 'Invalid invoice data', details: error.message })
    }
    return response.status(500).json({ error: 'Unable to save invoice' })
  }
})

router.delete('/:id', requireDriver, async (request, response) => {
  try {
    const invoice = await Invoice.findById(request.params.id)
    if (!invoice) return response.status(404).json({ error: 'Invoice not found' })
    if (invoice.driverId && invoice.driverId !== String(request.user.driverId)) {
      return response.status(403).json({ error: 'You do not have access to this invoice' })
    }
    await invoice.deleteOne()
    return response.status(204).send()
  } catch (error) {
    if (error.name === 'CastError') return response.status(400).json({ error: 'Invalid invoice id' })
    return response.status(500).json({ error: 'Unable to delete invoice' })
  }
})

function buildListFilter({ from, to, passenger }, driverId) {
  const filter = { driverId: String(driverId) }
  const createdAt = {}
  if (from) {
    const start = parseDate(from, 'Invalid from date')
    createdAt.$gte = start
  }
  if (to) {
    const end = parseDate(to, 'Invalid to date')
    end.setHours(23, 59, 59, 999)
    createdAt.$lte = end
  }
  if (Object.keys(createdAt).length > 0) filter.createdAt = createdAt
  if (passenger) filter.passengerName = { $regex: escapeRegex(String(passenger)), $options: 'i' }
  return filter
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

function formatInvoice(invoice) {
  const value = invoice.toObject()
  return {
    invoiceId: value._id,
    _id: value._id,
    passengerName: value.passengerName,
    driverId: value.driverId,
    driverName: value.driverName,
    vehicleNumber: value.vehicleNumber,
    pickup: value.pickup,
    pickupLocation: value.pickup,
    drop: value.drop,
    dropLocation: value.drop,
    distance: value.distance,
    fare: value.fare,
    gst: value.gst,
    GST: value.gst,
    discount: value.discount,
    paymentMode: value.paymentMode || 'Cash',
    totals: value.totals,
    total: value.totals?.total,
    shareToken: value.shareToken,
    expiresAt: value.expiresAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    date: value.createdAt,
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default router
