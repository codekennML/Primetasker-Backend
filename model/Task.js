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

    taskTime: {
      type: String,
      //set required
    },

    budget: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["Assigned", "Inactive", "Processing", "Open", "Completed"],
      default: "Open",
    },

    taskAddress: {
      type: String,
      required: function () {
        return this.taskType === "Physical";
      },
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: function () {
          return this.taskType === "Physical";
        },
      },
    },

    userDeleted: {
      type: Boolean,
      default: false,
    },

    // The Files upload will only be visible if the task has been accepted

    files: [
      {
        url: String,
      },
    ],

    taskEarliestDone: {
      type: Date,
      required: true,
    },

    taskDeadline: {
      type: Date,
      required: true,
    },

    offerCount: {
      type: Number,
      default: 0,
    },

    offers: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Offer",
      },
    ],

    comments: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Comment",
      },
    ],

    hasMoreComments: {
      type: Boolean,
      default: false,
      required: true,
    },

    isFlagged: {
      default: false,
    },

    flags: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Flag",
      },
    ],
  },

  { timestamps: true }
);

taskSchema.plugin(AutoIncrement, {
  inc_field: "task_id",
  id: "taskNums",
  start_seq: 1400,
});

const Tasks = mongoose.model("Task", taskSchema);

Tasks.createIndexes({
  location: "2dsphere",
  creator: 1,
  title: 1,
  description: 1,
  status: 1,
  budget: 1,
});

module.exports = Tasks;
