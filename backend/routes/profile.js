import { Router } from 'express'
import multer from 'multer'
import DriverProfile from '../models/DriverProfile.js'
import requireDriver from '../middleware/requireDriver.js'
import { uploadLogo } from '../middleware/upload.js'
import { getPresignedObjectUrl, getObjectKey } from '../utils/b2.js'

const router = Router()

router.get('/', requireDriver, async (request, response) => {
  try {
    const profile = await DriverProfile.findOne({ driverId: String(request.user.driverId) }).select('driverName vehicleNumber logoData logoMimeType logoSize updatedAt')
    return response.json(profile ? await formatProfile(profile) : { driverName: '', vehicleNumber: '', logoData: '', logoMimeType: '', logoSize: 0 })
  } catch {
    return response.status(500).json({ error: 'Unable to load saved driver data' })
  }
})

router.post('/logo', requireDriver, uploadSingle(uploadLogo, 'logo'), async (request, response) => {
  if (!request.file) return response.status(400).json({ error: 'Logo image is required' })
  try {
    const profile = await DriverProfile.findOneAndUpdate(
      { driverId: String(request.user.driverId) },
      {
        $set: {
          logoData: getObjectKey(request.file),
          logoMimeType: request.file.mimetype,
          logoSize: request.file.size,
        },
        $setOnInsert: {
          driverId: String(request.user.driverId),
          driverName: 'Driver',
          vehicleNumber: `DRIVER-${String(request.user.driverId).toUpperCase()}`,
        },
      },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).select('logoData logoMimeType logoSize updatedAt')
    return response.json({ message: 'Logo saved', logo: await formatLogo(profile) })
  } catch (error) {
    if (error.name === 'ValidationError') return response.status(400).json({ error: 'Invalid logo data' })
    return response.status(500).json({ error: 'Unable to save logo' })
  }
})

router.delete('/logo', requireDriver, async (request, response) => {
  try {
    const profile = await DriverProfile.findOneAndUpdate(
      { driverId: String(request.user.driverId) },
      { logoData: '', logoMimeType: '', logoSize: 0 },
      { returnDocument: 'after', runValidators: true },
    ).select('logoData logoMimeType logoSize updatedAt')
    if (!profile) return response.status(404).json({ error: 'Driver profile not found' })
    return response.json({ message: 'Logo deleted', logo: formatLogo(profile) })
  } catch {
    return response.status(500).json({ error: 'Unable to delete logo' })
  }
})

router.post('/save', requireDriver, async (request, response) => {
  const driverName = String(request.body.driverName || '').trim()
  const vehicleNumber = String(request.body.vehicleNumber || '').trim().toUpperCase()
  if (!driverName || !vehicleNumber) return response.status(400).json({ error: 'Driver name and vehicle number are required' })

  try {
    const profile = await DriverProfile.findOneAndUpdate(
      { driverId: String(request.user.driverId) },
      { driverId: String(request.user.driverId), driverName, vehicleNumber },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).select('driverName vehicleNumber')
    return response.json({ message: 'Saved successfully', profile })
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ error: 'Driver profile already exists' })
    if (error.name === 'ValidationError') return response.status(400).json({ error: 'Invalid driver profile' })
    return response.status(500).json({ error: 'Error saving driver profile' })
  }
})

router.delete('/clear', requireDriver, async (request, response) => {
  try {
    await DriverProfile.findOneAndDelete({ driverId: String(request.user.driverId) })
    return response.json({ message: 'Saved driver data cleared' })
  } catch {
    return response.status(500).json({ error: 'Unable to clear saved driver data' })
  }
})

async function formatProfile(profile) {
  const value = profile.toObject()
  return {
    ...value,
    logoData: await getPresignedObjectUrl(value.logoData),
  }
}

async function formatLogo(profile) {
  return {
    logoData: await getPresignedObjectUrl(profile.logoData),
    logoMimeType: profile.logoMimeType || '',
    logoSize: profile.logoSize || 0,
    updatedAt: profile.updatedAt,
  }
}

function uploadSingle(upload, fieldName) {
  return (request, response, next) => upload.single(fieldName)(request, response, (error) => {
    if (!error) return next()
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return response.status(413).json({ error: 'Logo must be 2 MB or smaller' })
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
      return response.status(400).json({ error: 'Only PNG, JPG, and SVG logos are supported' })
    }
    console.error('B2 logo upload failed:', error.message)
    return response.status(500).json({ error: 'Unable to upload logo' })
  })
}

export default router
