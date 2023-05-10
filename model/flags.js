const mongoose = require("mongoose");
const { Schema } = mongoose;

const flagSchema = Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    violation: {
      type: String,
      required: true,
      enum: [1, 2, 3, 4, 5],

      // enum representation : ["spam", "offensive", "discrimination", "hate", "porn", "breach"],
    },
    //user being reported
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    //task being reported
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    //comment being reported
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    reason: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Flag = mongoose.model("Flag", flagSchema);

module.exports = Flag;
