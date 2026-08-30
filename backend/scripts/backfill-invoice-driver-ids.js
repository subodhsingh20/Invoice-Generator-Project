import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('dotenv').config({ path: new URL('../.env', import.meta.url), override: true, quiet: true })

import mongoose from 'mongoose'
import Driver from '../models/Driver.js'
import DriverProfile from '../models/DriverProfile.js'
import Invoice from '../models/Invoice.js'

const applyChanges = process.argv.includes('--apply')
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI

if (!mongoUri) {
  console.error('MONGO_URI is required. Add it to backend/.env before running this script.')
  process.exitCode = 1
  process.exit()
}

const normalizeVehicleNumber = (value) => String(value || '').trim().toUpperCase()

function addUnique(map, key, value, source, conflicts) {
  if (!key || !value) return
  const existing = map.get(key)
  if (existing && existing.value !== value) {
    conflicts.push({ key, first: existing, second: { value, source } })
    return
  }
  if (!existing) {
    map.set(key, { value, source })
  }
}

async function main() {
  await mongoose.connect(mongoUri)

  try {
    const [drivers, profiles, invoices] = await Promise.all([
      Driver.find({}, { _id: 1, vehicleNumber: 1 }).lean(),
      DriverProfile.find({}, { driverId: 1, vehicleNumber: 1 }).lean(),
      Invoice.find({
        $or: [
          { driverId: { $exists: false } },
          { driverId: null },
          { driverId: '' },
        ],
      }).lean(),
    ])

    const vehicleToDriverId = new Map()
    const conflicts = []

    for (const driver of drivers) {
      addUnique(
        vehicleToDriverId,
        normalizeVehicleNumber(driver.vehicleNumber),
        String(driver._id),
        'Driver',
        conflicts,
      )
    }

    for (const profile of profiles) {
      addUnique(
        vehicleToDriverId,
        normalizeVehicleNumber(profile.vehicleNumber),
        String(profile.driverId),
        'DriverProfile',
        conflicts,
      )
    }

    const updates = []
    const unresolved = []

    for (const invoice of invoices) {
      const vehicleNumber = normalizeVehicleNumber(invoice.vehicleNumber)
      const match = vehicleToDriverId.get(vehicleNumber)
      if (!match) {
        unresolved.push({
          id: String(invoice._id),
          passengerName: invoice.passengerName || '',
          vehicleNumber: invoice.vehicleNumber || '',
        })
        continue
      }

      updates.push({
        updateOne: {
          filter: { _id: invoice._id },
          update: { $set: { driverId: match.value } },
        },
      })
    }

    console.log(`Found ${invoices.length} invoices without driverId.`)
    console.log(`Matched ${updates.length} invoices by vehicle number.`)
    console.log(`Unresolved invoices: ${unresolved.length}.`)
    if (conflicts.length > 0) {
      console.log(`Vehicle-number conflicts detected: ${conflicts.length}.`)
    }

    if (unresolved.length > 0) {
      console.log('Unresolved invoice IDs:')
      for (const item of unresolved) {
        console.log(`- ${item.id} | ${item.passengerName} | ${item.vehicleNumber}`)
      }
    }

    if (!applyChanges) {
      console.log('Dry run only. Re-run with --apply to write the matched driverId values.')
      return
    }

    if (updates.length === 0) {
      console.log('No driverId values needed updating.')
      return
    }

    const result = await Invoice.bulkWrite(updates, { ordered: false })
    console.log(`Backfill complete. Updated ${result.modifiedCount || 0} invoices.`)
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
