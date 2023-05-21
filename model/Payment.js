const mongoose = require("mongoose");
const { Schema } = mongoose;

const paySchema = Schema(
  {
    reference: {
      type: String,
      required: true,
    },

    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: "User",
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      required: true,
    },

    channel: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },

    gateway: {
      type: String,
      enum: ["Paystack", "Binance"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

paySchema.index({ reference: 1 });

const Payment = mongoose.model("Payment", paySchema);

module.exports = Payment;
