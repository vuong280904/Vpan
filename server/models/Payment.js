const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    planId: { type: String, required: true },

    amountSol: { type: Number, required: true },

    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    signature: { type: String },

    status: {
      type: String,
      enum: ['pending', 'confirmed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
