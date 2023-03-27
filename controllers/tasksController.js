const Task = require("../model/Task");
const mongoose = require("mongoose");
const Detail = require("../model/taskExtras");
const User = require("../model/User");
const { respond } = require("../helpers/response");
const { getAblyClient } = require("../config/Ably");

const createTask = async (req, res) => {
  const { fields } = req.body;

  const user = req.user;

  console.log(fields.creator, user);
  const { details, location, taskType, ...others } = fields;

  const newFields = {
    description: details,
    taskAddress: location?.place,
    location: {
      type: "Point",
      coordinates: [location?.lng, location?.lat],
    },
    ...others,
  };

  if (!user || user !== fields.creator) {
    respond(res, 403, "Forbidden. User does not match", null, 403);
  }
  console.log(newFields);

  const createdTask = await Task.create(newFields);

  if (!createdTask) {
    respond(res, 400, "Failed to create task", null, 400);
  }
  //initialize the server sent event fot notifying users of new tasks availability
  const ablyClient = await getAblyClient();

  const channel = ablyClient.channels.get("tasks");
  if (channel) {
    channel.publish("new_message", "messageAdded");
  }
  // await ablyClient.close();

  respond(res, 201, "task created success", createdTask, 201);
};

const getAllTasks = async (req, res) => {
  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Filtering Results - >>>>>>>>>>>>>>>>>>>//

  //Create a query array that we will push further conditions to, based on the received url params
  let query = [];

  const reqQuery = { ...req.query }; //Spread out the request params array

  const excludeParams = ["sort", "page", "search"]; //fields to remove from the list to be filtered

  excludeParams.forEach((params) => delete reqQuery[params]); //exclude unwanted fields

  // let filterOption;

  // const filter = reqQuery.filter;

  // switch (true) {
  //   default:
  //     filterOption = {};
  // }

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Searching Results - >>>>>>>>>>>>>>>>>>>>>//

  console.log(req.query);

  let searchQuery;

  const searchTerm = req.query?.search;

  if (searchTerm !== undefined && searchTerm !== "") {
    const isObjectId = searchTerm.match(/^[0-9a-fA-F]{24}$/); //Check if the query is a task id
    if (isObjectId) {
      taskQuery = { _id: mongoose.Types.ObjectId(searchTerm) }; //If its object Id, search in id field
    } else if (!isObjectId) {
      const queryRegex = new RegExp(searchTerm, "i");
      (searchString = { title: queryRegex }), (searchQuery = searchString);
    }
  } else {
    searchQuery = {};
  }

  //Hide deleted tasks from users  but show to admin

  //>>>>>>>>>>>>>>>>>>>>>>>>>>Filtering results >>>>>>>>>>>>>>//

  //task Type Filter
  let taskTypeFilter;

  const taskType = req.query?.taskType;

  if (taskType && taskType !== "All") {
    taskTypeFilter = { taskType: taskType };
  }

  //category filter

  let categoryFilter;

  let categoryToFilter = req.query?.categories;

  if (
    categoryToFilter &&
    (categoryToFilter !== undefined || categoryToFilter !== "")
  ) {
    categoryToFilter = categoryToFilter.split(",");
    categoryFilter = { category: { $in: categoryToFilter } };
  }
  console.log(categoryFilter);

  //budget price range filter
  let priceRangeFilter;
  let priceRange = req.query?.range;

  let minPrice;
  let maxPrice;
  if (priceRange) {
    //price range is a string of form "a, b"
    priceRange = priceRange.split(",");
    minPrice = parseInt(priceRange[0]) || 5000;
    maxPrice = parseInt(priceRange[1]) || 1000000;
    priceRangeFilter = { budget: { $gte: minPrice, $lte: maxPrice } };
  }

  console.log(priceRangeFilter);
  //offer Filter

  let offerFilter;
  const offersToFilter = req.query.zeroOffers;
  console.log(offersToFilter);

  if (offersToFilter && offersToFilter === "true") {
    //fetch only tasks with no offers
    offerFilter = { offers: null };
  }

  let statusFilter;

  const statusToFilter = req.query.assigned;

  if (statusToFilter && statusToFilter === "true") {
    //fetch only unassigned  tasks
    statusFilter = { status: { $nin: ["Assigned", "Inactive"] } };
  } else {
    //fetch only active tasks (assigned, completed, active etc)
    statusFilter = { status: { $ne: "Inactive" } };
  }

  //location && gps cordinates filter  regex filter

  let locationFilter;
  let location = req.query?.location;
  let distanceToSearch = req.query?.maxDistance;
  let geoNearFilter;

  if (
    taskType !== "Remote" &&
    location &&
    (location.place !== undefined || location.place !== "")
  ) {
    location = JSON.parse(location);

    //transform location into gps and location

    const place = location?.place;
    const lng = location?.lng;
    const lat = location?.lat;

    let distance;

    if (distanceToSearch.length > 1) {
      distanceToSearch = distanceToSearch.split(",");
      distance = Number(distanceToSearch[1]) * 1000;
    }

    const placeRegex = new RegExp(place, "i");

    locationFilter = {
      location: placeRegex,
    };

    geoNearFilter = {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [3.5851718, 6.4698419],
        },
        maxDistance: distance || 1000,
        distanceField: "distance",
        spherical: true,
      },
    };
  }

  if (geoNearFilter) {
    query.push(geoNearFilter);
  }

  const matchQuery = Object.assign(
    { userDeleted: false },
    searchQuery,
    offerFilter,
    categoryFilter,
    priceRangeFilter,
    statusFilter,
    locationFilter,
    taskTypeFilter
  );

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> --  Sorting Results - >>>>>>>>>>>>>>>>>//

  let fieldToSort;

  const taskSortField = req.query?.sort;
  // console.log(taskSortField);
  if (taskSortField === undefined || taskSortField === "") {
    fieldToSort = { createdAt: -1 };
  } else {
    const sortString = taskSortField.split(":");
    fieldToSort = { [sortString[0]]: Number(sortString[1]) };
  }

  // >>>>>>>>>>>>>>>>>>>>>>>>> - Paginating Results-  >>>>>>>>>>>>//

  const page = parseInt(req.query?.page) || 1; //Page being requested
  const pageSize = parseInt(req.query?.limit) || 10; //Number of items per page
  const docsToSkip = (page - 1) * pageSize; //Number of items to skip on page
  const totalResultCount = await Task.countDocuments(query);
  const pages = Math.ceil(totalResultCount / pageSize);

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Populate Query Array >>>>>>>>>>>>>>>>>>>>>>>.

  //fetch only non-deleted tasks for users

  // req?.roles?.includes("admin")
  //   ? null
  //   : (taskQuery = { ...taskQuery, userDeleted: false });

  // , isFlagged: false
  //Match stage

  query.push({
    $match: matchQuery,
  });
  //Lookup Stage for users
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
              Avatar: 1,
            },
          },
        ],

        as: "creator_details",
      },
    },
    { $unwind: "$creator_details" }
  );
  // limit the comments
  // query.push(
  //   {
  //     $lookup: {
  //       from: "comments",
  //       localField: "comments",
  //       foreignField: "_id",
  //       as: "populated_comments",
  //     },
  //   },

  //   {
  //     $lookup: {
  //       from: "users",
  //       localField: "populated_comments.createdBy",
  //       foreignField: "_id",
  //       pipeline: [
  //         {
  //           $project: {
  //             _id: 1,
  //             firstname: 1,
  //             lastname: 1,
  //             Avatar: 1,
  //           },
  //         },
  //       ],
  //       as: "comment_creator",
  //     },
  //   },

  //   {
  //     $addFields: {
  //       comments: {
  //         $map: {
  //           input: "$populated_comments",
  //           as: "comment",
  //           in: {
  //             $mergeObjects: [
  //               "$$comment",
  //               {
  //                 creator: {
  //                   $arrayElemAt: [
  //                     {
  //                       $filter: {
  //                         input: "$comment_creator",
  //                         cond: { $eq: ["$$this._id", "$$comment.createdBy"] },
  //                       },
  //                     },
  //                     0,
  //                   ],
  //                 },
  //               },
  //             ],
  //           },
  //         },
  //       },
  //     },
  //   },

  //   {
  //     $unset: ["populated_comments", "comment_creator", "comments.createdBy"],
  //   }
  // );
  //Sort Stage
  query.push(
    {
      $sort: fieldToSort,
    },
    {
      $project: {
        _id: 1,
        title: 1,
        "creator_details.Avatar": 1,
        budget: 1,
        location: 1,
        taskType: 1,
        status: 1,
        taskTime: 1,
        taskEarliestDone: 1,
        offerCount: 1,
      },
    }
  );

  //Pagination Stage
  query.push({
    $skip: docsToSkip,
  });
  query.push({
    $limit: pageSize,
  });

  console.log(query);

  // >>>>>>>>>>>>>>>>>> Returning Response  >>>>>>>>>>>>>>>>>>>>//

  const tasks = await Task.aggregate(query);

  const result = {
    tasks: tasks,
    meta: {
      page: page,
      pages: pages,
      totalDocs: totalResultCount,
    },
  };
  // return res.status(200).json(tasks);
  respond(res, 200, "tasks fetched success", result, 200);
};

const getUserTask = async (req, res) => {
  const userId = req.body;

  if (!userId) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const tasks = await Task.findById({ creator: userId });

  if (!tasks) {
    respond(res, 404, "No tasks found", null);
  }
  respond(res, 200, "tasks fetched success", tasks);
};

const getSpecificTask = async (req, res) => {
  const { id: taskId } = req.params;

  if (!taskId) {
    respond(res, 400, "Bad Request, Please try again");
    return res.status(400).json({ message: "Bad Request. Please try again" });
  }
  console.log(taskId);
  //Set tasks to Details :: TODO

  var task = await Task.findById(taskId).populate([
    {
      path: "comments",
      populate: {
        path: "createdBy",
        model: User,
        select: "Avatar lastname firstname",
      },
    },
    {
      path: "creator",
      model: User,
      select: "Avatar lastname firstname",
    },
  ]);

  const singleTask = {
    task: [task],
  };

  if (!task) {
    respond(res, 404, "Task does not exist", null, 400);
  }

  respond(res, 200, "tasks fetch success", singleTask, 200);
};

const updateTask = async (req, res) => {
  const { taskId, fields } = req.body;

  if (!taskId) {
    respond(res, 400, null, "Bad Request");
  }

  var task = await Task.findById(taskId);
  if (!task) respond(req, res, 404, null, "Task not Found");

  Object.keys(fields).map((key) => {
    if (key in task) {
      task[key] = fields[key];
    }
  });

  const updatedTask = await task.save();

  if (!updatedTask) {
    respond(res, 400, "Failed to update task", null);
  }

  respond(res, 200, "task update success", updatedTask);
};

const deleteTask = async (req, res) => {
  const { taskId } = req.query;
  if (!taskId) {
    return res.status(400).json({ message: "Bad Request, missing task id" });
  }

  const taskToDelete = await Task.findById(taskId);

  if (!taskToDelete) {
    return res.status(404).json({ message: "Error : Task Not Found" });
  }

  taskToDelete.userDeleted = true;
  taskToDelete = taskToDelete.save();

  if (!taskToDelete) {
    return res
      .status(400)
      .json({ message: "Failed to delete task. Please try again " });
  }

  return res.status(200).json({ message: "Your task has been deleted " });
};

module.exports = {
  getAllTasks,
  getUserTask,
  getSpecificTask,
  updateTask,
  deleteTask,
  createTask,
};
