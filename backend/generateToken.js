import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import jwt from 'jsonwebtoken'

const require = createRequire(import.meta.url)
require('dotenv').config({ path: resolve(import.meta.dirname, '.env'), quiet: true })

const secret = process.env.JWT_SECRET
const payloadArguments = process.argv.slice(2)

if (!secret) {
  console.error('JWT_SECRET is required in backend/.env')
  process.exit(1)
}

if (payloadArguments.length === 0) {
  console.error('Usage: node backend/generateToken.js driverId=123 role=driver')
  process.exit(1)
}

const payload = Object.fromEntries(payloadArguments.map(parseArgument))
const token = jwt.sign(payload, secret, { expiresIn: '24h' })
console.log(token)

function parseArgument(argument) {
  const separator = argument.indexOf('=')
  if (separator < 1) {
    console.error(`Invalid payload argument: ${argument}. Use key=value.`)
    process.exit(1)
  }

  const key = argument.slice(0, separator)
  const rawValue = argument.slice(separator + 1)
  return [key, parseValue(rawValue)]
}

function parseValue(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value !== '' && Number.isFinite(Number(value))) return Number(value)
  return value
}