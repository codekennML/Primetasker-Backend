const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = Schema({
  type: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },

  read: {
    type: Boolean,
    default: false,
  },
});

const notification = mongoose.model("notification", notificationSchema);

module.exports = notification;
