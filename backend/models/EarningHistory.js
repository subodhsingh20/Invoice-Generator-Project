import mongoose from 'mongoose'

const earningHistorySchema = new mongoose.Schema(
  {
    driverId: { type: String, required: true, index: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    totalRides: { type: Number, required: true, min: 0 },
    totalEarnings: { type: Number, required: true, min: 0 },
    averageFare: { type: Number, required: true, min: 0, default: 0 },
    paymentMethods: { type: Map, of: Number, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
)

earningHistorySchema.index({ driverId: 1, year: -1, month: 1 }, { unique: true })

export default mongoose.model('EarningHistory', earningHistorySchema)