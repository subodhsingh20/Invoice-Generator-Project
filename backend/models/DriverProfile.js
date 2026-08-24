import mongoose from 'mongoose'

const driverProfileSchema = new mongoose.Schema(
  {
    driverId: { type: String, required: true },
    driverName: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true, unique: true },
    logoData: { type: String, default: '' },
    logoMimeType: { type: String, enum: ['image/png', 'image/jpeg', 'image/svg+xml', ''], default: '' },
    logoSize: { type: Number, default: 0, max: 2 * 1024 * 1024 },
  },
  { timestamps: true },
)

driverProfileSchema.index({ driverId: 1 }, { unique: true })

export default mongoose.model('DriverProfile', driverProfileSchema)
