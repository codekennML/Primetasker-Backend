const bcrypt = require("bcrypt");
const User = require("../model/User");
const Booking = require("../model/Booking");
const { sub } = require("date-fns");
const mongoose = require("mongoose");

const date = new Date();
const pastDay = sub(date, { days: 1 });
const thisWeek = sub(date, { weeks: 0 });
const lastWeek = sub(date, { weeks: 1 });
const lastMonth = sub(date, { days: 30 });
const lastYear = sub(date, { years: 1 });

const getTopTaskers = async (req, res) => {
  const { timeQuery } = req.query;
  let timeframe;
  switch (true) {
    case timeQuery === "yesterday":
      timeframe = pastDay;
      break;
    case timeQuery === "thisWeek":
      timeframe = thisWeek;
      break;
    case timeQuery === "lastWeek":
      timeframe = lastWeek;
      break;
    case timeQuery === "lastMonth":
      timeframe = lastMonth;
      break;
    case timeQuery === "lastYear":
      timeframe = lastYear;
      break;
    default:
      timeframe = thisWeek;
  }
  console.log(timeframe);
  //   let query = [];
  //   query.push({
  //     $match: { $gte: { $toDate: timeframe } },
  //   });
};

const getTopCustomers = async () => {};

const getFlaggedCustomers = async () => {};

const getFlaggedTaskers = async () => {};

module.exports = {
  getTopTaskers,
  getTopCustomers,
  getFlaggedTaskers,
  getFlaggedCustomers,
};
