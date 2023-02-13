const bcrypt = require("bcrypt");
const User = require("../model/User");
const Booking = require("../model/Booking");
const mongoose = require("mongoose");

const getTopTaskers = async () => {};

const getTopCustomers = async () => {};

const getFlaggedBookings = async () => {};

module.exports = {
  getTopTaskers,
  getTopCustomers,
  getFlaggedTaskers,
  getFlaggedCustomers,
};
