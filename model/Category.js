const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = Schema({
  name: {
    type: String,
    required: true,
  },

  tagline: {
    type: String,
  },

  image: {
    type: String,
    required: true,
  },
});

categorySchema.index({ name: 1 });
module.exports = mongoose.model("Category", categorySchema);
