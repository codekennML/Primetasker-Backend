const Booking = require("../model/Booking");
const mongoose = require("mongoose");
const { sub } = require("date-fns");

const getAllBookings = async (req, res) => {
  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Filtering Results - >>>>>>>>>>>>>>>>>>>//

  //Create a query array that we will push further conditions to, based on the received url params
  let query = [];

  const reqQuery = { ...req.query }; //Spread out the request params array

  const excludeParams = ["sort", "page", "search"]; //fields to remove from the list to be filtered

  excludeParams.forEach((params) => delete reqQuery[params]); //exclude unwanted fields

  let filterOption;

  const filter = reqQuery.filter;

  switch (true) {
    default:
      filterOption = {};
  }

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Searching Results - >>>>>>>>>>>>>>>>>>>>>//
  let bookingQuery;

  const searchTerm = req.query?.search;

  if (searchTerm !== undefined && searchTerm !== "") {
    const isObjectId = searchTerm.match(/^[0-9a-fA-F]{24}$/); //Check if the query is a booking id

    if (isObjectId) {
      bookingQuery = { _id: mongoose.Types.ObjectId(searchTerm) }; //If its object Id, search in id field
    } else if (!isObjectId) {
      const queryRegex = new RegExp(searchTerm, "i");
      (searchString = {
        $or: [
          //   { "creator.firstname": queryRegex },
          //   { "creator.lastname": queryRegex },
          { title: queryRegex },
          { description: queryRegex },
        ],
      }),
        (bookingQuery = searchString);
    }
  } else {
    bookingQuery = {};
  }

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> --  Sorting Results - >>>>>>>>>>>>>>>>>//

  let fieldToSort;

  const bookingSortField = req.query?.sort;
  if (bookingSortField === undefined || bookingSortField === "") {
    fieldToSort = { createdAt: -1 };
  } else {
    const string = bookingSortField.toLowerCase().replaceAll(" ", "");
    fieldToSort = { [string]: 1 };
  }

  // >>>>>>>>>>>>>>>>>>>>>>>>> - Paginating Results-  >>>>>>>>>>>>//

  const page = parseInt(req.query?.page) || 1; //Page being requested
  const pageSize = parseInt(req.query?.limit) || 10; //Number of items per page
  const docsToSkip = (page - 1) * pageSize; //Number of items to skip on page
  const totalResultCount = await Booking.countDocuments(query);
  const pages = Math.ceil(totalResultCount / pageSize);

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Populate Query Array >>>>>>>>>>>>>>>>>>>>>>>.

  //   Match stage for queries
  query.push({
    $match: bookingQuery,
  });

  //Lookup query to find the tasker that accepted the task based on id
  query.push(
    {
      //Lookup query to find the creator of each booking based on the creator ref to the User table
      $lookup: {
        from: "users",
        localField: "tasker",
        foreignField: "_id",
        let: { tasker_id: { $toObjectId: "$tasker" } }, //find tasker

        pipeline: [
          { $match: { $expr: [{ _id: "$$tasker_id" }] } },
          {
            $project: {
              _id: 1,
              firstname: 1,
              lastname: 1,
              email: 1,
              gender: 1,
              phone: 1,
            },
          },
        ],

        as: "tasker_details",
      },
    },
    { $unwind: "$tasker_details" }
  );

  //Lookup query to get the details of the task that was booked
  query.push(
    {
      //Find task details
      $lookup: {
        from: "tasks",
        localField: "task_details",
        foreignField: "_id",
        let: { task_id: { $toObjectId: "$task_details" } },

        pipeline: [
          { $match: { $expr: [{ _id: "$$task_id" }] } },

          {
            $project: {
              _id: 1,
              creator: 1,
              title: 1,
              location: 1,
              taskType: 1,
              files: 1,
              taskEarliestDone: 1,
              taskDeadline: 1,
            },
          },
        ],

        as: "task_info",
      },
    },
    { $unwind: "$task_info" },

    //Obtain the details of the booking creator from the result of the task info lookup
    {
      $lookup: {
        from: "users",
        localField: "task_info.creator",
        foreignField: "_id",
        let: { task_creator_details: { $toObjectId: "$task_info.creator" } },

        pipeline: [
          { $match: { $expr: [{ _id: "$$task_creator_details" }] } },

          {
            $project: {
              _id: 0,
              firstname: 1,
              lastname: 1,
              email: 1,
              phone: 1,
              homeaddress: 1,
              taskState: 1,
            },
          },
        ],

        as: "task_creator",
      },
    },
    { $unwind: "$task_creator" }
  );

  //Lookup query to find the supervising staff for the booking
  query.push(
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        let: { category: { $toObjectId: "$assigned_to" } },

        pipeline: [
          { $match: { $expr: [{ _id: "$$category" }] } },

          {
            $project: {
              _id: 0,
              name: 1,
            },
          },
        ],

        as: "bookingCategory",
      },
    },
    { $unwind: "$bookingCategory" }
  );
  query.push(
    {
      $lookup: {
        from: "users",
        localField: "assigned_to",
        foreignField: "_id",
        let: { supervisor: { $toObjectId: "$assigned_to" } },

        pipeline: [
          { $match: { $expr: [{ _id: "$$supervisor" }] } },

          {
            $project: {
              _id: 0,
              firstname: 1,
              lastname: 1,
            },
          },
        ],

        as: "supervisor",
      },
    },
    { $unwind: "$supervisor" }
  );

  //Remove the tasker, assigned_to, task_details ref ids from result
  query.push({
    $project: {
      tasker: 0,
      assigned_to: 0,
      task_details: 0,
    },
  });

  //   Sort results based on sort params from frontend request query
  query.push({
    $sort: fieldToSort,
  });

  //   Pagination of results ::
  query.push({
    $skip: docsToSkip,
  });

  query.push({
    $limit: pageSize,
  });

  //   console.log(query);

  // >>>>>>>>>>>>>>>>>> Returning Response  >>>>>>>>>>>>>>>>>>>>//

  const bookings = await Booking.aggregate(query);

  res.status(200).json({
    message: "Bookings fetched successfully",
    data: {
      bookings: bookings,
      meta: {
        // count: users.length,
        page: page,
        pages: pages,
        totalDocs: totalResultCount,
      },
    },
  });
};

const getBookingSummaryStats = async (req, res) => {
  // const { startDate , endDate  } = req.query
  const date = new Date();
  const lastMonth = sub(date, { days: 30 });
  const lastWeek = sub(date, { weeks: 1 });
  const lastYear = sub(date, { years: 1 });

  const bookingStats = await Booking.aggregate([
    { $match: { createdAt: { $gte: lastYear } } },
    {
      $project: {
        month: { $month: "$createdAt" },
      },
    },

    {
      $group: {
        _id: "$month",
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $addFields: {
        _id: {
          $let: {
            vars: {
              monthsInString: [
                ,
                //month array index starts at 1 ,so index 0 has to be empty to get right count
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
            },
            in: {
              $arrayElemAt: ["$$monthsInString", "$_id"],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        x: "$_id",
        y: "$total",
      },
    },
  ]);

  res.status(200).json({
    stats: bookingStats,
  });
};

module.exports = {
  getAllBookings,
  getBookingSummaryStats,
  // updateUser,
  // deleteUser,
};
