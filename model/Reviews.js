const mongoose = require("mongoose");
const { Schema } = mongoose;

const reviewSchema = Schema({
  tasker: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
    required: true,
  },
  creator: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
    required: true,
  },
  taskId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Task",
    required: true,
  },
  rating: {
    type: Number,
  },
  message: {
    type: String,
    required: true,
  },
  moderated: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = { Review };
