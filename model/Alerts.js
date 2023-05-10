const mongoose = require("mongoose");
const { Schema } = mongoose;

const alertSchema = Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
    required: true,
  },
  taskType: {
    type: String,
    default: "Remote",
    enum: ["Remote", "Physical"],
    required: true,
  },
  location: {
    type: String,
    required: function () {
      return this.taskType === "Remote" ? false : true;
    },
  },
  categoryId: {
    type: Number,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },

  stemmedTextArray: [{ type: String }],

  userDeleted: {
    type: Boolean,
    default: false,
  },
});

const Alert = mongoose.model("Alert", alertSchema);

module.exports = Alert;
