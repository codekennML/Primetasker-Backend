const mongoose = require("mongoose");
const { Schema } = mongoose;

const resetTokenSchema = Schema({
  user: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
    ref: "User",
  },

  token: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    required: true,
  },

  expiresAt: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model("ResetToken", resetTokenSchema);
