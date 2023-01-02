const Task = require("../model/Task");
const mongoose = require("mongoose");

const getAllTasks = async (req, res) => {
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
  let taskQuery;

  const searchTerm = req.query?.search;

  if (searchTerm !== undefined && searchTerm !== "") {
    const isObjectId = searchTerm.match(/^[0-9a-fA-F]{24}$/); //Check if the query is a task id
    if (isObjectId) {
      taskQuery = { _id: mongoose.Types.ObjectId(searchTerm) }; //If its object Id, search in id field
    } else if (!isObjectId) {
      const queryRegex = new RegExp(searchTerm, "i");
      (searchString = {
        $or: [
          { "creator.firstname": queryRegex },
          { "creator.lastname": queryRegex },
          { budget: queryRegex },
          { title: queryRegex },
          { description: queryRegex },
        ],
      }),
        (taskQuery = searchString);
    }
  } else {
    taskQuery = {};
  }

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> --  Sorting Results - >>>>>>>>>>>>>>>>>//

  let fieldToSort;

  const taskSortField = req.query?.sort;
  if (taskSortField === undefined || taskSortField === "") {
    fieldToSort = { createdAt: -1 };
  } else {
    const string = taskSortField.toLowerCase().replaceAll(" ", "");
    fieldToSort = { [string]: 1 };
  }

  // >>>>>>>>>>>>>>>>>>>Creating the query Object >>>>>>>>>>>>>>>

  // let sortQuery;
  // sortQuery = Object.assign(taskQuery, fieldToSort);
  console.log(taskQuery);

  //Push the search and filter field into the aggregate query
  // query.push({
  //   $match: { firstname: "Camellia" },
  // });

  // >>>>>>>>>>>>>>>>>>>>>>>>> - Paginating Results-  >>>>>>>>>>>>//

  const page = parseInt(req.query?.page) || 1; //Page being requested
  const pageSize = parseInt(req.query?.limit) || 20; //Number of items per page
  const docsToSkip = (page - 1) * pageSize; //Number of items to skip on page
  const totalResultCount = await Task.countDocuments(query);
  const pages = Math.ceil(totalResultCount / pageSize);

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Populate Query Array >>>>>>>>>>>>>>>>>>>>>>>.

  //Match stage
  query.push({
    $match: taskQuery,
  });
  //Lookup Stage
  query.push(
    {
      //Lookup query to find the creator of each task based on the creator ref to the User table
      $lookup: {
        from: "users",
        localField: "creator",
        foreignField: "_id",
        let: { searchId: { $toObjectId: "$creator" } }, //creator id was stored as string, need to convert to object id

        pipeline: [
          { $match: { $expr: [{ _id: "$$searchId" }] } },

          {
            $project: {
              _id: 1,
              firstname: 1,
              lastname: 1,
              email: 1,
              gender: 1,
              homeaddress: 1,
              phone: 1,
            },
          },
        ],

        as: "creator_details",
      },
    },
    { $unwind: "$creator_details" }
  );
  //Sort Stage
  query.push({
    $sort: fieldToSort,
  });

  //Pagination Stage
  query.push({
    $skip: docsToSkip,
  });
  query.push({
    $limit: pageSize,
  });

  // console.log(query);

  // >>>>>>>>>>>>>>>>>> Returning Response  >>>>>>>>>>>>>>>>>>>>//

  const tasks = await Task.aggregate(query);

  res.status(200).json({
    message: "Tasks fetched successfully",
    data: {
      tasks: tasks,
      meta: {
        // count: users.length,
        page: page,
        pages: pages,
        totalDocs: totalResultCount,
      },
    },
  });
};

module.exports = {
  getAllTasks,
  // getSingleUser,
  // updateUser,
  // deleteUser,
};
