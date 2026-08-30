import mongoose from 'mongoose'

const invoiceSchema = new mongoose.Schema(
  {
    passengerName: { type: String, required: true, trim: true },
    driverId: { type: String, trim: true },
    driverName: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, required: true, trim: true },
    pickup: { type: String, required: true, trim: true },
    drop: { type: String, required: true, trim: true },
    distance: { type: Number, required: true, min: 0 },
    fare: { type: Number, required: true, min: 0 },
    gst: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    paymentMode: { type: String, default: 'Cash', trim: true },
    totals: {
      baseFare: { type: Number, required: true },
      gstRate: { type: Number, required: true },
      gstAmount: { type: Number, required: true },
      discountRate: { type: Number, required: true },
      discountAmount: { type: Number, required: true },
      total: { type: Number, required: true },
    },
    shareToken: { type: String, unique: true, sparse: true, index: true },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), expires: 0 },
  },
  { timestamps: true },
)

invoiceSchema.index({ driverId: 1, createdAt: -1 })
invoiceSchema.index({ driverId: 1, passengerName: 1 })

export default mongoose.model('Invoice', invoiceSchema)
