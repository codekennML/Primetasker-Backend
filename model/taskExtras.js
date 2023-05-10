const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;

const detailSchema = Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Task",
  },
});

module.exports = mongoose.model("Detail", detailSchema);
