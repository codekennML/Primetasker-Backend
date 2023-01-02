const mongoose = require("mongoose");
require("dotenv").config();
const { data } = require("./data");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI, {
      useUnifiedTopology: false,
      useNewUrlParser: true,
    });

    // console.log(process.env.DATABASE_URI);
  } catch (err) {
    console.error(err);
  }
};

module.exports = connectDB;
