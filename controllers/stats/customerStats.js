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

const getTopCustomers = async (req, res) => {
  //>>>>>>>>>>Constant timeframe filters for app >>>>>>>>>>>>>>>>>>
  const date = new Date();
  const lastMonth = formatDate(sub(date, { days: 30 }));
  // const endDate = sub(date, { days: 10 });

  let query;

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
        from: "tasks",
        localField: "task_details",
        foreignField: "_id",
        let: { taskId: { $toObjectId: "$task_details" } },

        pipeline: [{ $match: { $expr: [{ _id: "$$taskId" }] } }],
        as: "task_info",
      },
    },
    { $unwind: "$task_info" },
    { $set: { customer: "$task_info.creator" } },
    {
      $project: {
        booking_price: 1,
        commission: { $toDouble: "$commission" },
        customer: 1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "customer",
        foreignField: "_id",
        let: { customerId: { $toObjectId: "$customer" } },

        pipeline: [
          { $match: { $expr: [{ _id: "$$customerId" }] } },
          {
            $project: {
              Avatar: 1,
              customer: { $concat: ["$firstname", " ", "$lastname"] },
            },
          },
        ],
        as: "customer_info",
      },
    },
    { $unwind: "$customer_info" },

    {
      $group: {
        _id: "$customer_info.customer",
        revenue: { $sum: "$booking_price" },
        commissions: { $sum: "$commission" },
        completed: { $count: {} },
        avatar: { $first: "$customer_info.Avatar" },
      },
    },

    { $sort: { total: -1 } },
    { $limit: 5 },
  ];

  // console.log(queryParams);
  const topFiveCustomers = await Bookings.aggregate(queryParams);
  res.json(topFiveCustomers);
};

module.exports = { getTopCustomers };
