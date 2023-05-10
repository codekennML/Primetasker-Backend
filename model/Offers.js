const mongoose = require("mongoose");
const Task = require("./Task");
const User = require("./User");
const { Schema } = mongoose;

const offerSchema = Schema(
  {
    taskId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: Task,
      required: true,
    },

    createdBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: User,
      required: true,
    },

    offerAmount: {
      type: Number,
      required: true,
    },

    offerMessage: {
      type: String,
    },

    userDeleted: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Offer", offerSchema);
