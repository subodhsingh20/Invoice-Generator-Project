import { Router } from 'express'
import DriverProfile from '../models/DriverProfile.js'
import requireDriver from '../middleware/requireDriver.js'

const router = Router()
const allowedLogoMimeTypes = new Set(['image/png', 'image/jpeg', 'image/svg+xml'])
const maxLogoSize = 2 * 1024 * 1024
router.use(requireDriver)

router.get('/', async (request, response) => {
  try {
    const profile = await DriverProfile.findOne({ driverId: String(request.driver.driverId) }).select('driverName vehicleNumber logoData logoMimeType logoSize updatedAt')
    return response.json(profile || { driverName: '', vehicleNumber: '', logoData: '', logoMimeType: '', logoSize: 0 })
  } catch {
    return response.status(500).json({ error: 'Unable to load saved driver data' })
  }
})

router.post('/logo', async (request, response) => {
  const { logoData, logoMimeType, logoSize } = request.body
  if (!logoData || !logoMimeType || !logoSize) {
    return response.status(400).json({ error: 'Logo image, file type, and size are required' })
  }
  if (!allowedLogoMimeTypes.has(logoMimeType)) {
    return response.status(400).json({ error: 'Only PNG, JPG, and SVG logos are supported' })
  }
  if (!Number.isFinite(Number(logoSize)) || Number(logoSize) <= 0 || Number(logoSize) > maxLogoSize) {
    return response.status(400).json({ error: 'Logo must be 2 MB or smaller' })
  }
  if (!isBase64Image(logoData, logoMimeType)) {
    return response.status(400).json({ error: 'Invalid logo image data' })
  }

  try {
    const profile = await DriverProfile.findOneAndUpdate(
      { driverId: String(request.driver.driverId) },
      {
        $set: {
          logoData,
          logoMimeType,
          logoSize: Number(logoSize),
        },
        $setOnInsert: {
          driverId: String(request.driver.driverId),
          driverName: 'Driver',
          vehicleNumber: `DRIVER-${String(request.driver.driverId).toUpperCase()}`,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).select('logoData logoMimeType logoSize updatedAt')
    return response.json({ message: 'Logo saved', logo: formatLogo(profile) })
  } catch (error) {
    if (error.name === 'ValidationError') return response.status(400).json({ error: 'Invalid logo data' })
    return response.status(500).json({ error: 'Unable to save logo' })
  }
})

router.delete('/logo', async (request, response) => {
  try {
    const profile = await DriverProfile.findOneAndUpdate(
      { driverId: String(request.driver.driverId) },
      { logoData: '', logoMimeType: '', logoSize: 0 },
      { new: true, runValidators: true },
    ).select('logoData logoMimeType logoSize updatedAt')
    if (!profile) return response.status(404).json({ error: 'Driver profile not found' })
    return response.json({ message: 'Logo deleted', logo: formatLogo(profile) })
  } catch {
    return response.status(500).json({ error: 'Unable to delete logo' })
  }
})

router.post('/save', async (request, response) => {
  const driverName = String(request.body.driverName || '').trim()
  const vehicleNumber = String(request.body.vehicleNumber || '').trim().toUpperCase()
  if (!driverName || !vehicleNumber) return response.status(400).json({ error: 'Driver name and vehicle number are required' })

  try {
    const profile = await DriverProfile.findOneAndUpdate(
      { driverId: String(request.driver.driverId) },
      { driverId: String(request.driver.driverId), driverName, vehicleNumber },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).select('driverName vehicleNumber')
    return response.json({ message: 'Saved successfully', profile })
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ error: 'Driver profile already exists' })
    if (error.name === 'ValidationError') return response.status(400).json({ error: 'Invalid driver profile' })
    return response.status(500).json({ error: 'Error saving driver profile' })
  }
})

router.delete('/clear', async (request, response) => {
  try {
    await DriverProfile.findOneAndDelete({ driverId: String(request.driver.driverId) })
    return response.json({ message: 'Saved driver data cleared' })
  } catch {
    return response.status(500).json({ error: 'Unable to clear saved driver data' })
  }
})

function isBase64Image(value, mimeType) {
  const prefix = `data:${mimeType};base64,`
  if (!String(value).startsWith(prefix)) return false
  const payload = String(value).slice(prefix.length)
  return /^[A-Za-z0-9+/]+={0,2}$/.test(payload)
}

function formatLogo(profile) {
  return {
    logoData: profile.logoData || '',
    logoMimeType: profile.logoMimeType || '',
    logoSize: profile.logoSize || 0,
    updatedAt: profile.updatedAt,
  }
}

export default router
