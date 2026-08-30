import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Driver from '../models/Driver.js'
import DriverProfile from '../models/DriverProfile.js'
import DriverQr from '../models/DriverQr.js'
import Invoice from '../models/Invoice.js'
import requireDriver from '../middleware/requireDriver.js'

const router = Router()

router.post('/signup', async (request, response) => {
  const driverName = String(request.body.driverName || '').trim()
  const email = String(request.body.email || '').trim().toLowerCase()
  const password = String(request.body.password || '')
  const vehicleNumber = String(request.body.vehicleNumber || '').trim().toUpperCase()

  if (!driverName || !email || !password || !vehicleNumber) {
    return response.status(400).json({ error: 'All fields are required' })
  }
  if (!isValidEmail(email)) {
    return response.status(400).json({ error: 'Please enter a valid email address' })
  }
  if (password.length < 6) {
    return response.status(400).json({ error: 'Password must be at least 6 characters long' })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const driver = await Driver.create({ driverName, email, password: passwordHash, vehicleNumber })
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
      message: 'Signup successful',
      driver: formatDriver(driver),
    })
  } catch (error) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0]
      if (field === 'email') return response.status(409).json({ error: 'Email already exists' })
      if (field === 'vehicleNumber') return response.status(409).json({ error: 'Vehicle number already exists' })
      return response.status(409).json({ error: 'Driver already exists' })
    }
    return response.status(500).json({ error: 'Unable to create account' })
  }
})

router.post('/login', async (request, response) => {
  const email = String(request.body.email || '').trim().toLowerCase()
  const password = String(request.body.password || '')

  if (!email || !password) {
    return response.status(400).json({ error: 'Email and password are required' })
  }
  if (!isValidEmail(email)) {
    return response.status(400).json({ error: 'Please enter a valid email address' })
  }
  if (password.length < 6) {
    return response.status(400).json({ error: 'Password must be at least 6 characters long' })
  }

  try {
    const driver = await Driver.findOne({ email }).select('+password')
    if (!driver) return response.status(401).json({ error: 'Invalid credentials' })

    const isMatch = await bcrypt.compare(password, driver.password)
    if (!isMatch) return response.status(401).json({ error: 'Invalid credentials' })

    if (!process.env.JWT_SECRET) {
      return response.status(500).json({ error: 'JWT_SECRET is not configured' })
    }

    const token = jwt.sign(
      { driverId: String(driver._id), role: 'driver' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    )

    return response.json({
      message: 'Login successful',
      token,
      driver: formatDriver(driver),
    })
  } catch {
    return response.status(500).json({ error: 'Unable to login' })
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
  } catch {
    return response.status(500).json({ error: 'Unable to delete account' })
  }
})

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function formatDriver(driver) {
  return {
    driverId: String(driver._id),
    driverName: driver.driverName,
    email: driver.email,
    vehicleNumber: driver.vehicleNumber,
  }
}

export default router
