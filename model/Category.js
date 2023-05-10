const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);
const { Schema } = mongoose;

const categorySchema = Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },

  tagline: {
    type: String,
  },

  image: {
    type: String,
    required: true,
  },
});

categorySchema.plugin(AutoIncrement, {
  inc_field: "categoryId",
  id: "categoryLabel",
  start_seq: 1,
});

categorySchema.index({ title: 1, categoryId: 1 });

module.exports = mongoose.model("Category", categorySchema);
