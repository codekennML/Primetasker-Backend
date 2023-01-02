const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;
const bookingSchema = Schema(
  {
    tasker: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    booking_price: {
      type: Number,
      required: true,
      validate: {
        validator: function (price) {
          return price > 3000;
        },
        message: (props) => `${props.value} must be greater or equal to 3000 `,
      },
    },

    task_details: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    booking_start: {
      type: Date,
    },
    booking_ends: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["Accepted", "Processing", "Completed", "Cancelled", "Dispute"],
      default: "Accepted",
    },
  },

  {
    timestamps: true,
  }
);

bookingSchema.index({
  tasker: 1,
  status: 1,
  task_details: 1,
  booking_price: 1,
});

bookingSchema.plugin(AutoIncrement, {
  inc_field: "bookingID",
  id: "bookingNums",
  start_seq: 1024,
});

module.exports = mongoose.model("Booking", bookingSchema);
