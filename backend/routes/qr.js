import { Router } from 'express'
import DriverQr from '../models/DriverQr.js'
import requireDriver from '../middleware/requireDriver.js'

const router = Router()
const allowedMimeTypes = new Set(['image/png', 'image/jpeg'])
const maxQrSize = 2 * 1024 * 1024

router.get('/', requireDriver, async (request, response) => {
  try {
    const qr = await DriverQr.findOne({ driverId: String(request.driver.driverId) })
    if (!qr) return response.json({ imageData: null, mimeType: null, size: 0, updatedAt: null, exists: false })
    return response.json(formatQr(qr))
  } catch {
    return response.status(500).json({ error: 'Unable to fetch QR code' })
  }
})

router.post('/save', requireDriver, async (request, response) => {
  try {
    const { imageData, mimeType, size } = request.body
    if (!imageData || !mimeType || !size) {
      return response.status(400).json({ error: 'QR image, file type, and size are required' })
    }
    if (!allowedMimeTypes.has(mimeType)) {
      return response.status(400).json({ error: 'Only PNG and JPG QR images are supported' })
    }
    if (!Number.isFinite(Number(size)) || Number(size) <= 0 || Number(size) > maxQrSize) {
      return response.status(400).json({ error: 'QR image must be 2 MB or smaller' })
    }
    if (!isBase64Image(imageData, mimeType)) {
      return response.status(400).json({ error: 'Invalid QR image data' })
    }

    const qr = await DriverQr.findOneAndUpdate(
      { driverId: String(request.driver.driverId) },
      {
        driverId: String(request.driver.driverId),
        imageData,
        mimeType,
        size: Number(size),
      },
      { new: true, upsert: true, runValidators: true },
    )
    return response.json({ message: 'QR code saved', qr: formatQr(qr) })
  } catch (error) {
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: 'Invalid QR code data', details: error.message })
    }
    return response.status(500).json({ error: 'Unable to save QR code' })
  }
})

function isBase64Image(value, mimeType) {
  const prefix = `data:${mimeType};base64,`
  if (!String(value).startsWith(prefix)) return false
  const payload = String(value).slice(prefix.length)
  return /^[A-Za-z0-9+/]+={0,2}$/.test(payload)
}

function formatQr(qr) {
  return {
    imageData: qr.imageData,
    mimeType: qr.mimeType,
    size: qr.size,
    updatedAt: qr.updatedAt,
  }
}

export default router
