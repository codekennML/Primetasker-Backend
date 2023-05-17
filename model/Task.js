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

    categoryId: {
      type: Number,
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
      initialBudget: {
        type: Number,
        required: true,
      },
      assignedBudget: {
        type: Number,
      },
      finalBudget: {
        type: Number,
      },
    },

    status: {
      type: String,
      enum: [
        "Assigned",
        "Inactive",
        "Appeal",
        "Open",
        "Completed",
        "Cancelled",
      ],
      default: "Open",
    },

    hostMarkedAppeal: {
      type: Boolean,
      required: true,
      default: false,
    },
    hostMarkedComplete: {
      type: Boolean,
      required: true,
      default: false,
    },

    hostReleasedPayment: {
      type: Boolean,
      required: true,
      default: false,
    },

    taskerMarkedAppeal: {
      type: Boolean,
      required: true,
      default: false,
    },

    taskerMarkedComplete: {
      type: Boolean,
      required: true,
      default: false,
    },

    taskerRequestPayment: {
      type: Boolean,
      required: true,
      default: false,
    },

    step: {
      type: String,
      enum: ["offerApproved", "offerAwaitingApproval", "taskerArrived"],
    },

    assigned: {
      assigneeId: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
      assigneeFirstname: {
        type: String,
      },
      assigneeLastname: {
        type: String,
      },
      assigneeAvatar: {
        type: String,
      },

      assignedAt: {
        type: Date,
      },
      trackingCode: {
        type: String,
      },
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
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },

      placeId: {
        type: String,
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

    taskDeadline: {
      type: Date,
      required: false,
    },

    taskEarliestDone: {
      type: Date,
      required: function () {
        return this.taskDeadline ? false : true;
      },
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

    hasMoreOffers: {
      type: Boolean,
      default: false,
    },

    comments: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Comment",
      },
    ],

    hasMoreComments: {
      type: Boolean,
      default: false,
    },

    isFlagged: {
      type: Boolean,
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

// taskSchema.index({
//   location: "2dsphere",
//   creator: 1,
//   title: 1,
//   description: 1,
//   status: 1,
//   budget: 1,
// });

// Tasks.createIndexes();

module.exports = Tasks;
