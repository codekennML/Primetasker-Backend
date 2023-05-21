const mongoose = require("mongoose");

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    //1 : Debit of host for assigning
    //2 : task budget debit of host
    //3: task budget credit of reciver
    //4 : task budget refund to host,
    //5 :increase budget for locked task
    //6 : Task completion charge from tasker
    //7 : cancellation Fee
    type: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7],
      default: 1,
      required: true,
    },
    taskId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Task",
      required: true,
    },
    receiverId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },

    senderId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);

// const newTransaction = {
//   type: 1, //payment for task assigened
//   taskId: eventId,
//   sender: senderId,
//   receiver: receiverId,
//   amount: amount,
// };
