import { Router } from 'express'
import Driver from '../models/Driver.js'
import DriverProfile from '../models/DriverProfile.js'
import DriverQr from '../models/DriverQr.js'
import Invoice from '../models/Invoice.js'
import authenticateAppId from '../middleware/appIdAuth.js'
import requireDriver from '../middleware/requireDriver.js'

const router = Router()

router.post('/session', authenticateAppId, async (request, response) => {
  const identity = request.appIdAuthorizationContext.identityTokenPayload
  const email = String(identity.email || '').trim().toLowerCase()
  if (!email) return response.status(400).json({ error: 'App ID must provide an email address' })

  try {
    const existingDriver = await Driver.findOne({ appIdSub: identity.sub })
    if (existingDriver) {
      return response.json({
        message: 'Login successful',
        driver: formatDriver(existingDriver),
      })
    }

    const driverName = String(request.body?.driverName || '').trim()
    const vehicleNumber = String(request.body?.vehicleNumber || '').trim().toUpperCase()
    if (!driverName || !vehicleNumber) {
      return response.json({
        setupRequired: true,
        suggestedDriverName: String(identity.name || '').trim(),
      })
    }
    if (driverName.length > 120 || vehicleNumber.length > 32) {
      return response.status(400).json({ error: 'Driver name or vehicle number is too long' })
    }

    const driver = await Driver.create({
      appIdSub: identity.sub,
      driverName,
      email,
      vehicleNumber,
    })
    try {
      await DriverProfile.create({
        driverId: String(driver._id),
        driverName,
        vehicleNumber,
      })
    } catch (profileError) {
      await Driver.deleteOne({ _id: driver._id })
      throw profileError
    }

    return response.status(201).json({
      message: 'Account created successfully',
      driver: formatDriver(driver),
    })
  } catch (error) {
    if (error?.code === 11000) {
      if (error.keyPattern?.appIdSub) {
        const existingDriver = await Driver.findOne({ appIdSub: identity.sub })
        if (existingDriver) {
          return response.json({
            message: 'Login successful',
            driver: formatDriver(existingDriver),
          })
        }
      }
      if (error.keyPattern?.email) {
        return response.status(409).json({ error: 'An account with this email already exists' })
      }
      if (error.keyPattern?.vehicleNumber) {
        return response.status(409).json({ error: 'Vehicle number already exists' })
      }
      return response.status(409).json({ error: 'Driver account already exists' })
    }
    console.error('App ID account setup failed:', error?.name || 'Error', error?.message || 'Unknown error')
    return response.status(500).json({ error: 'Unable to save driver account' })
  }
})

router.delete('/delete-account', requireDriver, async (request, response) => {
  try {
    const driverId = String(request.user.driverId)
    await Promise.all([
      Driver.deleteOne({ _id: driverId }),
      DriverProfile.deleteOne({ driverId }),
      DriverQr.deleteOne({ driverId }),
      Invoice.deleteMany({ driverId }),
    ])
    return response.json({ message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Account deletion failed:', error?.message || 'Unknown error')
    return response.status(500).json({ error: 'Unable to delete account' })
  }
})

function formatDriver(driver) {
  return {
    driverId: String(driver._id),
    driverName: driver.driverName,
    email: driver.email,
    vehicleNumber: driver.vehicleNumber,
  }
}

export default router
