import mongoose from 'mongoose'

const driverSchema = new mongoose.Schema(
  {
    driverName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, required: true, select: false },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true, unique: true },
  },
  { timestamps: true },
)

export default mongoose.model('Driver', driverSchema)
