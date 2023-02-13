const {
  sub,
  format,
  startOfQuarter,
  lastDayOfMonth,
  startOfMonth,
} = require("date-fns");
const User = require("../../model/User");
const { formatDate } = require("../../helpers/dateHelper");
const Bookings = require("../../model/Booking");

const getTopTaskers = async (req, res) => {
  //>>>>>>>>>>Constant timeframe filters for app >>>>>>>>>>>>>>>>>>
  const date = new Date();
  const lastMonth = formatDate(sub(date, { days: 30 }));
  // const endDate = sub(date, { days: 10 });

  let query;

  // const date = new Date();
  // res.json(query);
  // console.log(startDate, endDate);

  let queryParams;

  queryParams = [
    {
      $match: {
        status: "Completed",
        createdAt: { $gte: new Date(lastMonth) },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "tasker",
        foreignField: "_id",
        let: { taskerId: { $toObjectId: "$tasker" } },

        pipeline: [
          { $match: { $expr: [{ _id: "$$taskerId" }] } },
          {
            $project: {
              _id: 0,
              Avatar: 1,
              tasker: { $concat: ["$firstname", " ", "$lastname"] },
            },
          },
        ],
        as: "tasker",
      },
    },
    { $unwind: "$tasker" },

    {
      $project: {
        // id: 0,
        avatar: "$tasker.Avatar",
        tasker: "$tasker.tasker",
        booking_price: 1,
        commission: { $toDouble: "$commission" },
      },
    },

    {
      $group: {
        _id: "$tasker",
        revenue: { $sum: "$booking_price" },
        commissions: { $sum: "$commission" },
        completed: { $count: {} },
        avatar: { $first: "$avatar" },
      },
    },

    { $sort: { total: -1 } },
    { $limit: 5 },
  ];

  // console.log(queryParams);
  const topFiveTaskers = await Bookings.aggregate(queryParams);
  res.json(topFiveTaskers);
};

module.exports = { getTopTaskers };
