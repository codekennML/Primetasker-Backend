const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;

const taskSchema = Schema(
  {
    // All Fields are required except the files explaining task
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    taskType: {
      type: String,
      enum: ["Remote", "Physical"],
      required: true,
    },

    budget: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    location: {
      type: String,
      required: function () {
        return this.taskType === "Physical";
      },
    },

    // The Files upload will only be visible if the task has been accepted

    files: {
      type: [String],
    },

    taskEarliestDone: {
      type: Date,
      required: true,
    },

    taskDeadline: {
      type: Date,
      required: true,
    },
  },

  { timestamps: true }
);
taskSchema.index({
  creator: 1,
  title: 1,
  description: 1,
  status: 1,
  budget: 1,
});

taskSchema.plugin(AutoIncrement, {
  inc_field: "task_id",
  id: "taskNums",
  start_seq: 1400,
});

module.exports = mongoose.model("Task", taskSchema);
