const mongoose = require("mongoose");
const { Schema } = mongoose;

const activateTokenSchema = Schema({
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
    default: new Date.now(),
  },

  expiresAt: {
    type: Date,
    required: true,
    default: new Date() + 7 * 24 * 60 * 60 * 1000,
  },
});

module.exports = mongoose.model("activateToken", resetTokenSchema);
