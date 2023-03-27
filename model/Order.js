const { Schema, default: mongoose } = require("mongoose");
const {
  default: Users,
} = require("../../app/myapp/src/Pages/dashboard/admin/Settings/UserSettings");

const orderSchema = Schema({
  customer: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: User,
    required: true,
  },

  tasker: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: Users,
    required: true,
  },

  booking: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: Booking,
    required: true,
  },

  type: {
    type: String,
    enum: ["deposit", "release"],
    required: true,
  },
});

module.exports = mongoose.model("Order", orderSchema);
