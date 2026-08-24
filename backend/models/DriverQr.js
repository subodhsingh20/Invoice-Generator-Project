import mongoose from 'mongoose'

const driverQrSchema = new mongoose.Schema(
  {
    driverId: { type: String, required: true, unique: true, index: true },
    imageData: { type: String, required: true },
    mimeType: { type: String, required: true, enum: ['image/png', 'image/jpeg'] },
    size: { type: Number, required: true, max: 2 * 1024 * 1024 },
  },
  { timestamps: true },
)

export default mongoose.model('DriverQr', driverQrSchema)
