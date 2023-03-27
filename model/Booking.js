const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;

const bookingSchema = Schema(
  {
    tasker: {
      type: Schema.Types.ObjectId,
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
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      default: "63bd5cc4b8f2d41cc989756f",
    },

    commission: {
      type: Schema.Types.Decimal128,
      default: function () {
        return this.booking_price * 0.2;
      },
      get: getBill,
    },

    gatewayFee: {
      type: mongoose.Schema.Types.Decimal128,
      default: function () {
        return this.booking_price * 0.015;
      },
      get: getBill,
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

    status: {
      type: String,
      enum: ["Accepted", "Processing", "Completed", "Cancelled", "Dispute"],
      default: "Accepted",
    },
  },

  // { toJSON: { getters: true } },

  {
    timestamps: true,
  }
);

function getBill(value) {
  if (typeof value !== "undefined") {
    return parseFloat(value.toString());
  }
  return value;
}

// bookingSchema.set({ toObject: { getters: true } });
// bookingSchema.set({ toJSON: { getters: true } });
// bookingSchema.index({
//   tasker: 1,
//   status: 1,
//   task_details: 1,
//   booking_price: 1,
// });

bookingSchema.plugin(AutoIncrement, {
  inc_field: "bookingID",
  id: "bookingNums",
  start_seq: 1024,
});

module.exports = mongoose.model("Booking", bookingSchema);
