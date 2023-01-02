const { th } = require("date-fns/locale");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    // Username, password, firstname , lastname , email only are required on signup

    username: {
      type: String,
      unique: true,
    },

    googleId: {
      type: String,
    },
    password: {
      type: String,
      required: function () {
        this.googleId ? false : true;
      },
    },
    mailVerifyCode: {
      type: Number,
      max: 6,
    },

    birthDate: {
      type: Date,
    },
    firstname: {
      type: String,
      max: 50,
    },
    homeaddress: {
      type: String,
      max: 300,
    },

    acceptedTos: {
      type: Boolean,
      required: function () {
        this.googleId ? false : true;
      },
      default: true,
    },

    city: {
      type: String,
      max: 255,
    },

    stateOfOrigin: {
      type: String,
      max: 50,
    },

    lastname: {
      type: String,
      max: 50,
    },

    maritalstatus: {
      type: String,
      enum: ["Single", "Married", "Divorced"],
    },

    gender: {
      type: String,
      max: 7,
    },

    phone: {
      type: String,
      max: 15,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      max: 255,
      required: true,
      trim: true,
    },
    roles: {
      type: [String],
      enum: ["Admin", "Guest", "Customer", "Tasker", "Manager"],
      default: "Admin",
    },

    bookings: {
      type: [mongoose.SchemaTypes.ObjectId],
      ref: "Booking",
    },

    transactions: {
      type: [mongoose.SchemaTypes.ObjectId],
      ref: "Transaction",
    },

    tasks: {
      type: [mongoose.SchemaTypes.ObjectId],
      ref: "Task",
    },

    verified: { type: Boolean, default: false },

    documents: [
      {
        type: String,
      },
    ],

    avatar: {
      type: String,
    },

    active: {
      type: Boolean,
      default: false,
    },

    canProcessTask: {
      type: Boolean,
      default: function () {
        return this.active && this.verified;
      },
    },

    userLevel: {
      type: [String],
      enum: ["Normal", "Premium"],
      default: "Normal",
    },

    taskContact: {
      type: String,
      max: 11,
    },
    taskMinAmount: {
      type: Number,
    },

    taskType: {
      type: String,
      default: function () {
        return this.verified ? "Hybrid" : "Online";
      },
      enum: ["Online", "Physical", "Hybrid"],
    },

    taskState: {
      type: String,
    },

    taskRadius: {
      type: String,
      default: function () {
        return this.level === "premium" ? "global" : this.taskState;
      },
    },

    bankDetails: [
      {
        accountName: {
          type: String,
          immutable: true,
          required: function () {
            return this.canProcessTask;
          },
        },
        accountNumber: {
          type: String,
          immutable: true,
          required: function () {
            return this.canProcessTask;
          },
        },

        bankName: {
          type: String,
          immutable: true,
          required: function () {
            return this.canProcessTask;
          },
        },
      },
    ],

    cardDetails: [
      {
        cardName: {
          type: String,
        },
        cardNumber: {
          type: Number,
        },
        cardExpiry: {
          type: String,
        },
      },
    ],
    // refreshToken : String
  },

  {
    timestamps: true,
  }
);

userSchema.index({ username: 1, email: 1, firstname: 1, lastname: 1 });
module.exports = mongoose.model("User", userSchema);
