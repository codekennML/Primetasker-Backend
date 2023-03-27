const mongoose = require("mongoose");
// const Task = require("./Task")
// const User = require("./User")
const { Schema } = mongoose;

const commentSchema = Schema(
  {
    disabled: {
      type: Boolean,
      default: false,
    },

    parent: {
      //the refence to the parent -
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Comment",
      required: false,
    },

    isParent: {
      //check if this is the first comment
      type: Boolean,
      required: true,
      default: false,
    },

    hasParent: {
      type: Boolean,
      default: false,
    },

    taskId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Task",
    },

    createdBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
    },
    files: [
      {
        file: String,
        url: String,
      },
    ],
    body: {
      type: String,
      required: function () {
        this.files.length < 1 ? true : false;
      },
    },
    replies: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Comment",
      },
    ],

    active: {
      type: Boolean,
      default: true,
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

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Comment", commentSchema);
