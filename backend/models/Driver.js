import mongoose from 'mongoose'

const driverSchema = new mongoose.Schema(
  {
    driverName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    appIdSub: { type: String, required: true, unique: true, sparse: true },
    password: { type: String, required: false, select: false },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true, unique: true },
  },
  { timestamps: true },
)

export default mongoose.model('Driver', driverSchema)
