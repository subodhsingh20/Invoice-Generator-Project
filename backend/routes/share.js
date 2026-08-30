import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import Invoice from '../models/Invoice.js'
import requireDriver from '../middleware/requireDriver.js'

const router = Router()

router.get('/:id/whatsapp', requireDriver, async (request, response) => {
  try {
    const invoice = await Invoice.findById(request.params.id)
    if (!invoice) return response.status(404).json({ error: 'Invoice not found' })
    if (invoice.driverId && invoice.driverId !== String(request.user.driverId)) {
      return response.status(403).json({ error: 'You do not have access to this invoice' })
    }

    if (!invoice.shareToken) {
      invoice.shareToken = randomBytes(5).toString('base64url')
      await invoice.save()
    }

    const baseUrl = `${request.protocol}://${request.get('host')}`
    const shareLink = `${baseUrl}/share/${invoice.shareToken}`
    const message = `Ride bill for ${invoice.passengerName || 'Passenger'}\n${invoice.pickup || 'Pickup'} to ${invoice.drop || 'Drop'}\nTotal: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(invoice.totals?.total || 0))}\nInvoice: ${shareLink}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`

    return response.json({ url: whatsappUrl, shareLink })
  } catch (error) {
    if (error.name === 'CastError') return response.status(400).json({ error: 'Invalid invoice id' })
    return response.status(500).json({ error: 'Unable to create WhatsApp share link' })
  }
})

router.post('/:id', requireDriver, async (request, response) => {
  try {
    const invoice = await Invoice.findById(request.params.id)
    if (!invoice) return response.status(404).json({ error: 'Invoice not found' })
    if (invoice.driverId && invoice.driverId !== String(request.user.driverId)) {
      return response.status(403).json({ error: 'You do not have access to this invoice' })
    }
    if (!invoice.shareToken) {
      invoice.shareToken = randomBytes(5).toString('base64url')
      await invoice.save()
    }
    return response.json({ token: invoice.shareToken, path: `/share/${invoice.shareToken}` })
  } catch (error) {
    if (error.name === 'CastError') return response.status(400).json({ error: 'Invalid invoice id' })
    return response.status(500).json({ error: 'Unable to create share link' })
  }
})

router.get('/:token', async (request, response) => {
  try {
    const invoice = await Invoice.findOne({ shareToken: request.params.token })
    if (!invoice) return response.status(404).json({ error: 'Invoice not found' })
    return response.json(formatSharedInvoice(invoice))
  } catch {
    return response.status(500).json({ error: 'Unable to fetch shared invoice' })
  }
})

function formatSharedInvoice(invoice) {
  return {
    passengerName: invoice.passengerName,
    driverName: invoice.driverName,
    vehicleNumber: invoice.vehicleNumber,
    pickup: invoice.pickup,
    drop: invoice.drop,
    distance: invoice.distance,
    fare: invoice.fare,
    gst: invoice.gst,
    discount: invoice.discount,
    paymentMode: invoice.paymentMode || 'Cash',
    totals: invoice.totals,
    total: invoice.totals?.total,
    createdAt: invoice.createdAt,
  }
}

export default router
