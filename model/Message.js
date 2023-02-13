const mongoose = require("mongoose");
const { stringify } = require("uuid");
const Chat = require("./Chat");
const { Schema } = mongoose;

const messageSchema = Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    chat: {
      type: Schema.Types.ObjectId,
      ref: Chat,
      required: true,
    },
    body: {
      type: String,
      trim: true,
    },
    files: [
      {
        url: {
          type: String,
        },
        // required: function () {
        //     return this.body ? false : true;
        //   },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
