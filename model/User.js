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
      suite: {
        type: String,
        required: true,
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
      },
    },

    acceptedTos: {
      type: Boolean,
      default: true,
    },

    bio: {
      type: String,
      required: false,
    },

    interestType: {
      //1 : Tasker, //2:Customer //3:Both
      type: Number,
      default: 3,
    },

    city: {
      type: String,
      max: 255,
    },

    portfolio: {
      resume: {
        type: String,
        required: false,
      },

      skills: [
        {
          title: {
            type: String,
            required: true,
          },

          badge: {
            type: String,
            required: false,
          },
          experience: {
            type: Number,
            required: true,
          },
        },
      ],
    },

    showcase: {
      hasMore: {
        type: Boolean,
        default: false,
      },

      canAddMore: {
        type: Boolean,
        default: true,
      },

      items: [
        {
          url: {
            type: String,
            required: true,
          },
        },
      ],
    },

    // Add City Coordinates:

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
      default: "Guest",
    },

    verified: { type: Boolean, default: false },

    userIdimage: { type: String },

    userUtilityBill: { type: String },

    Avatar: {
      type: String,
    },

    active: {
      type: Boolean,
      default: true,
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

    bankDetails: {
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

    // cardDetails: [
    //   {
    //     cardName: {
    //       type: String,
    //     },
    //     cardNumber: {
    //       type: Number,
    //     },
    //     cardExpiry: {
    //       type: String,
    //     },
    //   },
    // ],

    alerts: [
      {
        text: String,
        location: String,
        taskType: String,
      },
    ],

    notifications: {
      //1 - Email , 2-SMS, 3-Push
      transactions: {
        type: [Number],
        enum: [1, 2, 3],
        default: [1],
      },

      taskUpdates: {
        type: [Number],
        enum: [1, 2, 3],
        default: [1, 2, 3],
      },
      taskReminders: {
        type: [Number],
        enum: [1, 2, 3],
        default: [1, 2, 3],
      },
      taskRecommendations: {
        type: [Number],
        enum: [1, 2, 3],
        default: [1, 3],
      },
      matchingAlerts: {
        type: [Number],
        enum: [2, 3],
        default: [3],
      },
      taskHelpInfo: {
        type: [Number],
        enum: [1, 3],
        default: [1, 3],
      },
      newsLetter: {
        type: [Number],
        enum: [1, 3],
        default: [1],
      },
    },

    verification: {
      addressVerified: { type: Boolean, default: false },

      idVerified: { type: Boolean, default: false },

      avatarAdded: { type: Boolean, default: false },

      mobileVerified: { type: Boolean, default: false },

      ageVerified: { type: Boolean, default: false },

      bankVerified: { type: Boolean, default: false },
    },

    // refreshToken : String
  },

  {
    timestamps: true,
  }
);

// userSchema.index({ username: 1, email: 1, firstname: 1, lastname: 1 });
module.exports = mongoose.model("User", userSchema);
