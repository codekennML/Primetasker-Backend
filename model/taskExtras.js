const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;

const detailSchema = Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Task",
  },

  offers: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Offer",
  },
  comments: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Comment",
  },
});

module.exports = mongoose.model("Detail", detailSchema);
