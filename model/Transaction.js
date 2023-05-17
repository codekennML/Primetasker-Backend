const mongoose = require("mongoose");

const { Schema } = mongoose;

const transactionSchema = new Schema({
  //1 : task budget debit of host
  //2 : task budget credit of reciver
  //3 : task budget refund to host
  type: {
    type: Number,
    enum: [1, 2, 3],
    default: 1,
  },
  taskId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Task",
  },
  receiverId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
  },

  senderId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
  },

  amount: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);

// const newTransaction = {
//   type: 1, //payment for task assigened
//   taskId: eventId,
//   sender: senderId,
//   receiver: receiverId,
//   amount: amount,
// };
