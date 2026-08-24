import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('dotenv').config({ path: new URL('./.env', import.meta.url), override: true, quiet: true })
import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import invoiceRoutes from './routes/invoice.js'
import reportRoutes from './routes/reports.js'
import shareRoutes from './routes/share.js'
import profileRoutes from './routes/profile.js'
import qrRoutes from './routes/qr.js'

const app = express()
const port = Number(process.env.PORT) || 5000
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean)

app.use(cors({ origin: (origin, callback) => { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origin not allowed by CORS')) } }))
app.use('/qr', express.json({ limit: '3mb' }), qrRoutes)
app.use('/profile', express.json({ limit: '3mb' }), profileRoutes)
app.use(express.json({ limit: '50kb' }))
app.get('/health', (request, response) => response.json({ status: 'ok' }))
app.use('/invoice', invoiceRoutes)
app.use('/reports', reportRoutes)
app.use('/share', shareRoutes)

if (!mongoUri) {
  console.error('MONGODB_URI is required. Add it to .env before starting the server.')
  process.exitCode = 1
} else {
  mongoose
    .connect(mongoUri)
    .then(() => app.listen(port, () => console.log(`Invoice API listening on port ${port}`)))
    .catch((error) => {
      console.error('MongoDB connection failed:', error.message)
      process.exitCode = 1
    })
}

export default app
