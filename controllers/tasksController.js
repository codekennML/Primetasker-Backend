const Task = require("../model/Task");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const Detail = require("../model/taskExtras");
const User = require("../model/User");
const Offer = require("../model/Offers");
const { respond } = require("../helpers/response");
// const { getAblyClient } = require("../config/Ably");
const keywordMatchQueue = require("../Queues/taskAlertsQueue,js");
const emitter = require("../helpers/Emitter");
const language = require("@google-cloud/language");

const path = require("path");
const Alert = require("../model/Alerts");
const stringSimilarity = require("string-similarity");

const client = new language.LanguageServiceClient();
const keyPath = path.join(__dirname, "..", "config", "primetasker.json");

// Set the environment variable for the JSON file path
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
// });

const { tokenizeStemLemma } = require("../helpers/tokeniseStem");
const {
  handleTaskAssignment,
  handleAdminFeeDeduction,
  retryTransaction,
  handleHostCancellation,
  handleTaskerCancellation,
  handleLockBudget,
  handleReleasePayment,
} = require("../helpers/transactionUpdate");
const { query } = require("express");
const {
  generateRandomId,
  generateTaskTrackingCode,
  randomNumberOTP,
} = require("../helpers/createUniqId");

const createTask = async (req, res) => {
  const { fields } = req.body;

  const user = req.user;

  // if (!user || user !== fields.creator) {
  //   respond(res, 403, "Forbidden. User does not match", null, 403);
  // }

  // console.log(fields);
  const { details, Avatar, budget, location, ...others } = fields;

  let newFields;

  if (fields.taskType === "Remote") {
    newFields = {
      budget: {
        initialBudget: budget,
        finalBudget: 0,
      },
      description: details,
      ...others,
    };
  } else {
    newFields = {
      budget: {
        initialBudget: budget,
        finalBudget: 0,
      },
      description: details,
      taskAddress: location?.name,
      location: {
        type: "Point",
        coordinates: [location?.lng, location?.lat],
      },
      ...others,
    };
  }

  let createdTask = await Task.create(newFields);

  if (!createdTask) {
    respond(res, 400, "Failed to create task", null, 400);
  }
  // Insert the task creators avatar and id for rendering  into the created task for rendering within the inifinte scroll comp since our sse would not have populated these as we are sending as sse plus we dont want to make another db call

  createdTask = createdTask.toJSON();
  createdTask.id = createdTask._id;
  createdTask.creator_details = {
    Avatar: Avatar,
  };

  emitter.emit("new-task", newFields);

  // const text = `${newFields.title} ${newFields.description}`;
  // let entitiesToCompare;

  // try {
  //   const document = {
  //     content: text,
  //     type: "PLAIN_TEXT",
  //   };

  //   const [result] = await client.analyzeEntities({ document });

  //   const entities = result?.entities;

  //   const allEntities =
  //     entities?.length > 0
  //       ? entities.reduce((acc, entity) => {
  //           const result = tokenizeStemLemma(entity);
  //           return acc.concat(result);
  //         }, [])
  //       : [];

  //   entitiesToCompare = Array.from(new Set(allEntities));
  // } catch (err) {
  //   console.log(err);
  // }

  // const regexString = entitiesToCompare.map((term) => `(${term})`).join("|");

  //Perform string similarity test using the description text and the alerts texts and if the score > 27%. return the alert

  // const AlertsWithMatchingStems = await Alert.find({
  //   // stemmedTextArray: { $regex: regexString },
  //   stemmedTextArray: { $in: entitiesToCompare },
  //   categoryId: { $eq: createdTask.categoryId },
  // });

  // console.log(AlertsWithMatchingStems);

  // const highlySimilarAlerts = (entries) => {
  //   const tokenizedText = tokenizeStemLemma(text).toString();

  //   entries.forEach((entry) => {
  //     const tokenizedEntry = tokenizeStemLemma(entry.text).toString();

  //     const similarityScore = stringSimilarity.compareTwoStrings(
  //       tokenizedText,
  //       tokenizedEntry
  //     );
  //     // const similarityScore = nlp.similarity.cosine(text, entry.text);
  //     console.log(similarityScore, entry._id);

  //     if (similarityScore && similarityScore > 0.27 && entry) {
  //       // usersToAlert.push(entry);

  //       emitter.emit("notify", {
  //         type: "AlertMatch",
  //         userId: entity.userId,
  //         content: createdTask._id, //We will use the content to hold the taskID that is matched so we can provide a link to the task in the frontend
  //       });

  //       sendAlertMatchMailTaskQueue.add({
  //         userId: entity.userId,
  //         taskId: createdTask._id,
  //       });

  //       //Add Push Notification
  //       // sendPushNotification()
  //     }
  //   });
  // };

  //Execute the function to compare similarities & sendMail, Notificaton and push notification
  // highlySimilarAlerts(AlertsWithMatchingStems);

  // usersToAlert?.length > 0 ? sendAlertMatchTaskQueue.add({
  //   userId :
  // }) : null;

  // console.log(entitiesToCompare);

  //KEEP THIS CODE FOR WHEN THE SSE ENDPOINT NEEDS TO SCALE ,
  //AUTOMATICALLY SWITCH TO ABLY FOR TASKS ALERTING BY COMMENTING OUT THE CODE

  // initialize the server sent event fot notifying users of new tasks availability
  // const ablyClient = await getAblyClient();

  // const channel = ablyClient.channels.get("tasks");
  // if (channel) {
  //   channel.publish("new_message", JSON.stringify(createdTask));
  // }

  // sse.send(createdTask, "message")
  // await ablyClient.close();

  respond(res, 201, "task created success", createdTask, 201);
};

const getAllTasks = async (req, res) => {
  // console.log(req.query, req.params);
  const queryObject = JSON.parse(req.query.filterParams);
  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Filtering Results - >>>>>>>>>>>>>>>>>>>//

  //Create a query array that we will push further conditions to, based on the received url params
  let query = [];

  const reqQuery = { ...queryObject }; //Spread out the request params array

  const excludeParams = ["sort", "page", "search"]; //fields to remove from the list to be filtered

  excludeParams.forEach((params) => delete reqQuery[params]); //exclude unwanted fields

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Searching Results - >>>>>>>>>>>>>>>>>>>>>//

  let searchQuery;

  const searchTerm = queryObject?.search;

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

  const taskType = queryObject?.taskType;

  if (taskType && (taskType === "Remote" || taskType === "Physical")) {
    taskTypeFilter = {
      taskType: {
        $eq: taskType,
      },
    };
  }

  //category filter

  let categoryFilter;

  let categoryToFilter = queryObject?.categories;

  if (categoryToFilter?.length > 0) {
    categoryFilter = { categoryId: { $in: categoryToFilter } };
  }
  // console.log(categoryFilter);

  //budget price range filter
  let priceRangeFilter;
  let priceRange = queryObject?.range;

  let minPrice;
  let maxPrice;
  if (priceRange) {
    //price range is a string of form "a, b"

    minPrice = parseInt(priceRange[0]) || 5000;
    maxPrice = parseInt(priceRange[1]) || 1000000;
    priceRangeFilter = { budget: { $gte: minPrice, $lte: maxPrice } };
  }

  //offer Filter

  let offerFilter;
  const offersToFilter = queryObject.zeroOffers;
  // console.log(offersToFilter);

  if (offersToFilter && offersToFilter === "true") {
    //fetch only tasks with no offers
    offerFilter = { offerCount: { $eq: 0 } };
  }

  let statusFilter;

  const statusToFilter = queryObject.assigned;

  if (statusToFilter && statusToFilter === "true") {
    //fetch only unassigned  tasks
    statusFilter = { status: { $nin: ["Assigned", "Inactive"] } };
  } else {
    //fetch only active tasks (assigned, completed, active etc)
    statusFilter = { status: { $ne: "Inactive" } };
  }

  //location && gps cordinates filter  regex filter

  let locationFilter;
  let location = queryObject?.location;
  // console.log(location);
  let distanceToSearch = queryObject?.maxDistance;
  let geoNearFilter;

  if (
    taskType !== "Remote" &&
    location &&
    (location.place !== undefined || location.place !== "")
  ) {
    location = JSON.parse(location);
    // console.log(location);

    //transform location into gps and location

    const place = location?.place;
    const lng = location?.lng;
    const lat = location?.lat;

    let distance;

    if (distanceToSearch.length > 1) {
      distance = parseInt(distanceToSearch[1]) * 1000;
    }

    //set location to place

    const placeRegex = new RegExp(place, "i");

    locationFilter = {
      taskAddress: placeRegex,
    };
    if (lng && lat) {
      geoNearFilter = {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: distance || 1000,
        },
      };
    }
  }

  // if (geoNearFilter) {
  //   query.push(geoNearFilter);
  // }

  const matchQuery = Object.assign(
    { userDeleted: false },
    searchQuery,
    offerFilter,
    categoryFilter,
    priceRangeFilter,
    statusFilter,
    // locationFilter,
    taskTypeFilter
  );

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> --  Sorting Results - >>>>>>>>>>>>>>>>>//

  let fieldToSort;

  const taskSortField = queryObject?.sort;
  // console.log(taskSortField);
  if (taskSortField === undefined || taskSortField === "") {
    fieldToSort = { createdAt: -1 };
  } else {
    const sortString = taskSortField.split(":");
    fieldToSort = { [sortString[0]]: Number(sortString[1]) };
  }

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Populate Query Array >>>>>>>>>>>>>>>>>>>>>>>.

  //fetch only non-deleted tasks for users

  // req?.roles?.includes("admin")
  //   ? null
  //   : (taskQuery = { ...taskQuery, userDeleted: false });

  // , isFlagged: false
  //Match stage

  // query.push({
  //   $match: matchQuery,
  // });
  // query.push ({
  //   count : "total"
  // })

  // >>>>>>>>>>>>>>>>>>>>>>>>> - Paginating Results-  >>>>>>>>>>>>//

  const page = parseInt(queryObject?.page) || 1; //Page being requested
  const pageSize = parseInt(queryObject?.limit) || 10; //Number of items per page
  const docsToSkip = (page - 1) * pageSize; //Number of items to skip on page

  // >>>>>>>>>>>>>>>>>> Returning Response  >>>>>>>>>>>>>>>>>>>>//

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
        taskAddress: 1,
        taskType: 1,
        status: 1,
        taskTime: 1,
        taskEarliestDone: 1,
        taskDeadline: 1,
        offerCount: 1,
        createdAt: 1,
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

  const result = await Task.aggregate([
    { $match: matchQuery }, //Match stage inside query object
    {
      $facet: {
        count: [{ $count: "total" }],
        matchedDocuments: query,
      },
    },

    {
      $unwind: "$count",
    },
    {
      $project: {
        _id: 0,
        count: "$count.total",
        data: "$matchedDocuments",
      },
    },
  ]);

  let tasks;

  if (result.length === 0) {
    tasks = {
      tasks: [],
      meta: {
        count: 0,
        page: 0,
        pages: 0,
      },
    };
  } else {
    tasks = {
      tasks: result[0].data,
      meta: {
        count: result[0]?.count,
        page: page,
        pages: Math.ceil(result[0].count / pageSize),
      },
    };
  }
  console.log(tasks);

  respond(res, 200, "tasks fetched success", tasks, 200);
};

const getUserTask = async (req, res) => {
  console.log(req.query);

  const userId = req.user;
  // const userId = req.user;
  console.log(userId);

  if (!userId) {
    return res.status(400).json({ message: "Bad Request" });
  }

  let query = [];

  let searchQuery;

  const searchTerm = req.query.search;

  if (searchTerm !== undefined && searchTerm !== "") {
    const queryRegex = new RegExp(searchTerm, "i");
    searchQuery = { title: queryRegex };
  }

  let statusFilter;
  const status = req.query.status;

  if (
    status !== undefined &&
    (status === "Open" ||
      status === "Assigned" ||
      status === "Completed" ||
      status === "Appeal")
  ) {
    statusFilter = { status: { $eq: status } };
  } else {
    statusFilter = { status: { $ne: "Inactive" } };
  }

  const page = parseInt(req.query.page) || 1; //Page being requested
  const pageSize = parseInt(req.query.limit) || 10; //Number of items per page
  const docsToSkip = (page - 1) * pageSize; //Number of items to skip on page

  query.push({
    $project: {
      _id: 1,
      creator: 1,
      assigned: 1,
      status: 1,
      budget: 1,
      taskTime: 1,
      taskType: 1,
      taskDeadline: 1,
      taskEarliestDone: 1,
      title: 1,
      offerCount: 1,
    },
  });
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
              Avatar: 1,
            },
          },
        ],

        as: "creator_details",
      },
    },
    { $unwind: "$creator_details" }
  );

  //Pagination Stage
  query.push({
    $skip: docsToSkip,
  });

  query.push({
    $limit: pageSize,
  });

  const matchQuery = Object.assign(
    { creator: { $eq: ObjectId(userId) } },
    searchQuery ?? {},
    statusFilter ?? {}
  );

  const result = await Task.aggregate([
    { $match: matchQuery }, //Match stage inside query object
    {
      $facet: {
        count: [{ $count: "total" }],
        matchedDocuments: query,
      },
    },

    {
      $unwind: "$count",
    },
    {
      $project: {
        _id: 0,
        count: "$count.total",
        data: "$matchedDocuments",
      },
    },
  ]);

  let tasks;

  if (result.length === 0) {
    tasks = {
      tasks: [],
      meta: {
        count: 0,
        page: 0,
        pages: 0,
      },
    };
  } else {
    tasks = {
      tasks: result[0].data,
      meta: {
        count: result[0]?.count,
        page: page,
        pages: Math.ceil(result[0].count / pageSize),
      },
    };
  }

  respond(res, 200, "tasks fetched success", tasks, 200);
};

const getSpecificTask = async (req, res) => {
  const { id: taskId } = req.params;

  if (!taskId) {
    respond(res, 400, "Bad Request, Please try again");
    return res.status(400).json({ message: "Bad Request. Please try again" });
  }
  // console.log(taskId);
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
    {
      path: "offers",
      populate: {
        path: "createdBy",
        model: User,
        select: "Avatar lastname firstname",
      },
      options: {
        sort: { createdAt: -1 }, // Sort offers by createdAt in descending order
      },
    },
  ]);

  const singleTask = {
    task: [task],
  };

  if (!task) {
    respond(res, 404, "Task does not exist", null, 404);
  }

  respond(res, 200, "tasks fetch success", singleTask, 200);
};

const assignTask = async (req, res) => {
  const { taskId, assigneeId, amount, offerId } = req.body;

  const hostId = req.user;
  console.log(req.user);

  if (!taskId || !assigneeId || !amount || !offerId || !hostId) {
    return respond(res, 400, "Bad Request", null, 400);
  }

  var task = await Task.findById(taskId);

  if (!task) return respond(res, 404, "Error: Task not found", null, 404);

  const assignee = await User.findById(assigneeId);

  if (!assignee) return respond(res, 404, "Error: User not found", null, 404);

  const result = await handleTaskAssignment(hostId, taskId, amount, offerId);

  if (result.error) return respond(res, 409, `${result.error}`, null, 409);

  return respond(res, 200, "Success : task assigned success", result.data, 200);
};

const lockBudget = async (req, res) => {
  const { taskId, newBudget } = req.body;
  console.log(req.body);
  const hostId = req.user;

  if (!taskId || !hostId || !newBudget) {
    return respond(res, 400, "Error : Bad Request", null, 400);
  }

  const result = await handleLockBudget(hostId, taskId, newBudget);
  // const result = handleTaskAssignment(hostId, assigneeId, taskId, amount);

  if (result.error) return respond(res, 409, `${result.error}`, null, 409);

  return respond(res, 200, `Budget Approved.`, null, 200);
};

const updateTaskBudget = async (req, res) => {
  const { taskId, finalBudget } = req.body;

  const currentUser = req.user;

  if (!taskId || !finalBudget || !currentUser) {
    return respond(res, 400, "Bad Request", null, 400);
  }

  var task = await Task.findById(taskId);

  if (!task) return respond(res, 404, "Task not Found", null, 404);
  console.log(task.assigned.assigneeId.toString(), currentUser);

  if (currentUser !== task.assigned.assigneeId?.toString())
    return respond(res, 403, "Forbidden ", null, 403);

  task.budget = Object.assign(task.budget, {
    finalBudget: finalBudget,
  });
  task.step = "offerAwaitingApproval";
  const updatedTask = await task.save();

  if (!updatedTask) {
    return respond(res, 409, "Failed to send final offer", null, 409);
  }

  return respond(res, 200, "Final Offer Update Success", updatedTask, 200);
};

const generateTaskCommencementCode = async (req, res) => {
  const { coordinates, taskId } = req.query;
  const currentUser = req.user;

  if (!coordinates.lng || !coordinates.lat)
    return respond(
      res,
      400,
      "Please enable your location to continue",
      null,
      400
    );

  if (!taskId)
    return respond(res, 400, "Bad Request, Please try again ", null, 400);

  const task = await Task.findById(taskId);

  if (!task) return respond(res, 404, "Task Not Found, try again  ", null, 404);

  const code = generateRandomId();

  if (!code)
    return respond(
      res,
      409,
      "Code Generation Failed, Please try again ",
      null,
      409
    );

  if (currentUser !== task.assigned.assigneeId.toString())
    return respond(res, 403, "Forbidden ", null, 403);

  const startCode = code.substring(0, 8);

  task.commencementCode = startCode;

  task.taskerLastLocation = {
    type: "Point",
    coordinates: [Number(coordinates.lng), Number(coordinates.lat)],
  };

  const updatedTask = await task.save();

  if (!updatedTask)
    return respond(
      res,
      409,
      "Code Generation Failed, Please try again ",
      null,
      409
    );

  return respond(res, 200, "Operation success ", startCode, 200);
};

const confirmTaskerArrival = async (req, res) => {
  const { code, taskId } = req.query;

  const currentUser = req.user;

  if (!code) return respond(res, 400, "Invalid Code. ", null, 400);

  const task = await Task.findById(taskId);

  if (!task) return respond(res, 404, "Task Not Found, try again  ", null, 404);

  if (currentUser !== task.creator.toString())
    return respond(res, 403, "Forbidden", null, 403);

  if (code !== task.commencementCode)
    return respond(res, 403, "Invalid Code. Please try again   ", null, 403);

  task.status = "Processing";

  const processingTask = await task.save();

  if (!processingTask)
    return respond(
      res,
      409,
      "Operation Failed, Please try again   ",
      null,
      409
    );

  return respond(res, 200, "Arrival validated", null, 200);
};

const sendReleaseOTP = async (req, res) => {
  const { id: taskId } = req.params;

  console.log(req.params);

  const currentUser = req.user;

  const task = await Task.findById(taskId);

  const OTP = randomNumberOTP();

  if (currentUser === task.creator.toString()) {
    task.hostReleaseOTP = OTP;

    //TODO:Send OTP SMS
    //TODO :SendOTP Email
  } else {
    return respond(res, 403, "Forbidden", null, 403);
  }
  console.log(OTP);
  const updatedTask = await task.save();

  if (!updatedTask) return respond(res, 409, "Operation Failed", null, 409);

  return respond(res, 200, "Operation Success", OTP, 200);
};

const markCompleteAndRequestPayment = async (req, res) => {
  const { taskId } = req.query;

  const currentUser = req.user;

  if (!taskId) return respond(res, 400, "Bad Request", null, 400);

  const task = await Task.findById(taskId);

  if (!task) return respond(res, 404, "Task Not Found", null, 404);

  if (currentUser !== task.assigned.assigneeId.toString())
    return respond(res, 403, "Forbidden", null, 403);

  task.taskerMarkedComplete = true;
  task.taskerRequestPayment = true;

  const finishedTask = await task.save();

  if (!finishedTask) return respond(res, 409, "Operation Failed", null, 409);

  return respond(res, 200, "Operation Success", finishedTask, 200);
};

const markCompleteAndReleasePayment = async (req, res) => {
  const { taskId, OTP, taskerId } = req.body;
  console.log(req.body);

  const currentUser = req.user;
  console.log(currentUser);
  if (!taskId || !OTP || !taskerId)
    return respond(res, 400, "Bad Request", null, 400);

  let response;

  try {
    const result = await retryTransaction(
      handleReleasePayment,
      3,
      currentUser,
      taskId,
      OTP,
      taskerId
    );
    response = result;
  } catch (error) {
    response = error;
  }
  console.log(response);

  if (response.error || response.message)
    return respond(res, 409, "Failed to release payment", null, 409);

  return respond(res, 200, "Payment success", response.data, 200);
};

const appealTask = async (req, res) => {
  const { id: taskId } = req.params;
  console.log(req.params);

  const currentUser = req.user;

  if (!taskId)
    return respond(res, 400, "Bad Request, Please Try again", null, 400);

  const task = await Task.findById(taskId);

  if (!task) return respond(res, 404, "Task Not Found", null, 404);

  console.log(task.creator, currentUser);

  if (currentUser === task.creator.toString()) {
    task.hostMarkedAppeal = true;
  } else if (currentUser === task.assigned.assigneeId.toString()) {
    task.taskerMarkedAppeal = true;
  } else {
    return respond(res, 403, "Forbidden", null, 403);
  }

  task.status = "Appeal";

  const appealedTask = await task.save();

  if (!appealedTask) return respond(res, 409, "Operation Failed", null, 409);

  return respond(res, 200, "Operation Success", appealedTask, 200);
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

const cancelTask = async (req, res) => {
  const { who, initiatorId, taskId, status, hostId } = req.body;

  console.log(req.body);

  if (!who || !initiatorId || !taskId || !status || !hostId)
    return respond(res, 400, "Bad Request", null, 400);

  const taskToCancel = await Task.findById(taskId);

  if (!taskToCancel) return respond(res, 404, "Task Not Found", null, 404);

  //-----------------------------------------------------//

  async function cancelTask(task) {
    task.status = "Cancelled";

    const cancelledTask = await task.save();

    cancelledTask
      ? (result = {
          status: 200,
          message: "Task Cancelled",
          data: cancelledTask,
        })
      : (result = {
          status: 409,
          message: "Failed to cancel task",
          data: null,
        });
  }
  //-----------------------------------------------------//

  let result;

  if (status === "Open") {
    result = await cancelTask(taskToCancel);
  }

  if (status === "Assigned" && who === "Host") {
    result = await handleHostCancellation(taskId, hostId);
  }
  // if (who === "Assignee") {
  //   result = await handleTaskerCancellation(taskId, initiatorId, hostId);
  // }

  if (result?.error || result?.status === 409)
    return respond(res, 409, "Operation Failed", null, 409);

  return respond(res, 200, "Operation Success", null, 200);
};

module.exports = {
  getAllTasks,
  getUserTask,
  getSpecificTask,
  updateTaskBudget,
  deleteTask,
  createTask,
  assignTask,
  cancelTask,
  lockBudget,
  confirmTaskerArrival,
  generateTaskCommencementCode,
  sendReleaseOTP,
  markCompleteAndRequestPayment,
  markCompleteAndReleasePayment,
  appealTask,
};
