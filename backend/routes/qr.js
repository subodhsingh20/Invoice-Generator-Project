import { Router } from 'express'
import multer from 'multer'
import DriverQr from '../models/DriverQr.js'
import requireDriver from '../middleware/requireDriver.js'
import { uploadQr } from '../middleware/upload.js'
import { getObjectKey, getPresignedObjectUrl } from '../utils/b2.js'

const router = Router()

router.get('/', requireDriver, async (request, response) => {
  try {
    const qr = await DriverQr.findOne({ driverId: String(request.user.driverId) })
    if (!qr) return response.json({ imageData: null, mimeType: null, size: 0, updatedAt: null, exists: false })
    return response.json(await formatQr(qr))
  } catch {
    return response.status(500).json({ error: 'Unable to fetch QR code' })
  }
})

router.post('/save', requireDriver, uploadSingle(uploadQr, 'qr'), async (request, response) => {
  try {
    if (!request.file) return response.status(400).json({ error: 'QR image is required' })

    const qr = await DriverQr.findOneAndUpdate(
      { driverId: String(request.user.driverId) },
      {
        driverId: String(request.user.driverId),
        imageData: getObjectKey(request.file),
        mimeType: request.file.mimetype,
        size: request.file.size,
      },
      { returnDocument: 'after', upsert: true, runValidators: true },
    )
    return response.json({ message: 'QR code saved', qr: await formatQr(qr) })
  } catch (error) {
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: 'Invalid QR code data', details: error.message })
    }
    return response.status(500).json({ error: 'Unable to save QR code' })
  }
})

async function formatQr(qr) {
  return {
    imageData: await getPresignedObjectUrl(qr.imageData),
    mimeType: qr.mimeType,
    size: qr.size,
    updatedAt: qr.updatedAt,
  }
}

function uploadSingle(upload, fieldName) {
  return (request, response, next) => upload.single(fieldName)(request, response, (error) => {
    if (!error) return next()
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return response.status(413).json({ error: 'QR image must be 2 MB or smaller' })
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
      return response.status(400).json({ error: 'Only PNG and JPG QR images are supported' })
    }
    console.error('B2 QR upload failed:', error)
    return response.status(500).json({
      error: 'Unable to upload QR code',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    })
  })
}

export default router
