const mongoose = require("mongoose");
const User = require("./User");

const { Schema } = mongoose;

const transactionSchema = new Schema({
  initiator: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: User,
    required: true,
  },

  trans_type: {
    type: String,
    required: true,
  },

  details: {
    bank: {
      type: String,
      required: true,
    },
    channel: { type: String, required: true },
    amount: { type: Number, required: true },
    card_type: { type: String },
    account_name: { type: String, required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);
