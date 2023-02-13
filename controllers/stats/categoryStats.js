const {
  format,
  parseISO,
  sub,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} = require("date-fns");
const Booking = require("../../model/Booking");
const { formatDate } = require("../../helpers/dateHelper");
// const Category = require("../../model/Category");

const getTopCategories = async (req, res) => {
  const date = new Date();
  // console.log(date);
  const startOfLastMonth = formatDate(
    startOfMonth(
      sub(date, {
        months: 1,
      })
    )
  );
  const today = formatDate(date);
  const startOfThisWeek = formatDate(startOfWeek(date));
  const startOfThisMonth = formatDate(startOfMonth(date));
  const startOfThisQuarter = formatDate(startOfQuarter(date));
  const startOfThisYear = formatDate(startOfYear(date));

  // console.log(formatDate(startOfWeek(date)));

  let startDate;
  let endDate;

  if (req.query.startDate || req.query.endDate) {
    startDate = req.query.startDate
      ? formatDate(req.query.startDate)
      : startOfThisWeek;
    endDate = req.query.endDate ? formatDate(req.query.endDate) : today;
  } else {
    //Return result for this week by calc data from start of this week to today
    startDate = startOfLastMonth;
    endDate = today;
  }
  // console.log(startDate, endDate);

  let query = [
    {
      $match: {
        createdAt: {
          $gte: new Date("2023-01-10"),
          $lte: new Date("2023-01-14"),
        },
        status: "Completed",
      },
    },

    {
      $project: {
        category: 1,
        gatewayFee: 1,
        commission: { $toDouble: "$commission" },
        booking_price: 1,
        status: 1,
      },
    },

    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        // let: { category_id: { $toObjectId: "$category" } },
        pipeline: [
          // { $match: { $expr: [{ _id: "$$category_id" }] } },
          { $project: { _id: 0, name: 1, image: 1 } },
        ],
        as: "category",
      },
    },

    { $unwind: "$category" },

    {
      $group: {
        _id: "$category.name",
        total: { $sum: "$booking_price" },
        totalComms: { $sum: "$commission" },
        count: { $count: {} },
        image: { $addToSet: "$category.image" },
      },
    },

    { $sort: { total: -1 } },

    // { $limit: 5 },
  ];
  // console.log(query);
  const topCategories = await Booking.aggregate(query);
  res.json(topCategories);
};

module.exports = { getTopCategories };
