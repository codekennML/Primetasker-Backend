const bcrypt = require("bcrypt");
const User = require("../model/User");
const Booking = require("../model/Booking");
const mongoose = require("mongoose");
const { respond } = require("../helpers/response");
const requestIp = require("request-ip");
var uap = require("ua-parser-js");
const { getUserLocationIP } = require("../helpers/getUserLocationFromIP");
const axios = require("axios");

const getAllUsers = async (req, res) => {
  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Filtering Results - >>>>>>>>>>>>>>>>>>>//
  const reqQuery = { ...req.query }; //Spread out the request array

  const excludeParams = ["sort", "page", "search"]; //fields to remove from the list to be filtered

  excludeParams.forEach((params) => delete reqQuery[params]); //exclude unwanted fields

  let filterOption;

  const roles = ["Admin", "Manager", "Tasker", "Customer"];
  const gender = ["Male", "Female"];

  // console.log(reqQuery.filter);
  const filter = reqQuery.filter;

  switch (true) {
    case roles.includes(filter):
      filterOption = { roles: filter };
      break;
    case gender.includes(filter):
      filterOption = { gender: filter };
      break;
    case filter === "Active":
      filterOption = { active: true };
      break;
    case filter === "Inactive":
      filterOption = { active: false };
      break;
    case filter === "Verified":
      filterOption = { verified: true };
      break;
    case filter === "Unverified":
      filterOption = { verified: false };
      break;
    default:
      filterOption = {};
  }

  // query.push(filterOption);

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Searching Results - >>>>>>>>>>>>>>>>>>>>>//
  let userQuery;
  // console.log(req.query);

  const searchTerm = req.query?.search;

  if (req.query.search) {
    const isObjectId = searchTerm.match(/^[0-9a-fA-F]{24}$/); //Check if the query is a user id

    if (isObjectId) {
      userQuery = { _id: searchTerm };
    } //If its object Id, search in id field
    else if (!isObjectId) {
      const queryRegex = new RegExp(searchTerm, "i");
      (searchString = {
        $or: [
          { firstname: queryRegex },
          { lastname: queryRegex },
          { email: queryRegex },
          { stateOfOrigin: queryRegex },
          { phone: queryRegex },
        ],
      }),
        (userQuery = searchString);
    }
  } else {
    userQuery = {};
  }

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> --  Sorting Results - >>>>>>>>>>>>>>>>>//

  let fieldToSort;

  const sortTerm = req.query?.sort;
  if (req.query.sort) {
    const string = sortTerm.toLowerCase().replaceAll(" ", "");
    fieldToSort = { [string]: 1 };
  } else {
    fieldToSort = { createdAt: -1 };
  }

  // >>>>>>>>>>>>>>>>>>>Creating the query Object >>>>>>>>>>>>>>>

  let query;
  query = Object.assign(userQuery, filterOption);

  // >>>>>>>>>>>>>>>>>>>>>>>>> - Paginating Results-  >>>>>>>>>>>>//

  const page = parseInt(req.query?.page) || 1; //Page being requested
  const pageSize = parseInt(req.query?.limit) || 10; //Number of items per page
  const docsToSkip = (page - 1) * pageSize; //Number of items to skip on page
  const totalResultCount = await User.countDocuments(query);
  const pages = Math.ceil(totalResultCount / pageSize);

  // console.log(totalResultCount);

  // >>>>>>>>>>>>>>>>>> Returning Response  >>>>>>>>>>>>>>>>>>>>//

  const users = await User.find(query)
    .sort(fieldToSort)
    .select("-password")
    .skip(docsToSkip)
    .limit(pageSize)
    .lean();

  if (!users?.length || page > pages) {
    return res.status(400).json({
      message:
        "The term you entered did not return any result. Please search again",
    });
  }
  res.status(200).json({
    message: "success",
    count: users.length,
    page,
    pages,
    totalDocs: totalResultCount,
    data: users,
  });
};

const getSingleUser = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res
      .status(400)
      .json({ message: "User ID must be sent with request" });
  }

  const user = await User.findById(id).select("-password").exec();

  if (user) {
    return res.status(200).json({ user });
  } else {
    return res.status(404).json({ message: "User does not exist" });
  }
};

const updateUser = async (req, res) => {
  const fields = req.body;
  const { email, id, roles } = fields;

  if (!email || !id) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const user = await User.findOne({ email }).exec(); //Check if user exists in DB
  const canUpdate =
    (roles.some((role) => user.roles.includes(role)) && user._id === id) ||
    roles.includes("Admin"); //check if the roles in the request match any of thr user roles

  if (!user) {
    return res.status(404).json({ message: "User does not exist" });
  } else if (!canUpdate) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  Object.keys(fields).map((key) => {
    if (key in user) {
      user[key] = fields[key];
    }
  });

  // If app allows for username chabge , then check for duplicate username

  // const duplicateUser = await User.findOne({ username }).collation({ locale : 'en', strength : 2 }).lean().exec()
  // if (duplicateUser && duplicateUser?._id.toString() !== id){
  //     res.status(404).json({message : 'Username already taken'})
  // }

  // if(password){
  //   user.password =  await bcrypt.hash(password , 10)
  // }

  // user.firstname = req.body?.firstname;
  // user.lastname = req.body?.lastname;
  // user.maritalstatus = req.body?.maritalstatus;
  // user.birthDate = req.body?.birthDate;
  // user.phone = req.body?.phone;
  // user.gender = req.body?.gender;
  // user.homeaddress = req.body?.homeaddress;
  // user.roles = req.body?.roles;
  // user.city = req.body?.city;
  // user.stateOfOrigin = req.body?.stateOfOrigin;
  // user.avatar = req.body?.avatar;
  // user.documents = req.body?.documents;
  // user.username = req.body?.username;
  // user.taskContact = req.body?.taskContact;
  // user.minTaskAmt = req.body?.minTaskAmt;
  // user.taskState = req.body?.taskState;
  // user.taskType = req.body?.taskType;
  // user.bankDetails = req.body?.bankDetails;
  // user.cardDetails = req.body?.cardDetails;

  const updatedUser = await user.save();
  // if (updatedUser){
  return res.json({
    message: `User details updated successfully `,
  });
  // }
};

const deleteUser = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User ID required" });
  }

  const userToDelete = await User.findById(id).exec();

  if (!userToDelete) {
    return res.status(404).json({ message: "User Not Found" });
  }

  // const deletedUser = await userToDelete.deleteOne();

  const response = `User with ID ${deletedUser._id} deleted`;

  res.status(200).json({ message: response });
};

const getUserSystemInfo = async (req, res) => {
  // 197.253.58.225
  const clientIp = "102.88.35.51";

  //These are ips that are generated by reqIp for localhost or postman connections
  const ipsToIgnore = {
    a: "127.0.0.1",
    b: "::1",
    c: "::ffff:127.0.0.1",
  };

  // const userLocationDetails = await getUserLocationIP(clientIp, ipsToIgnore);

  let userLocaleData = {};

  if (clientIp && !(clientIp in Object.values(ipsToIgnore))) {
    const locationFromIPUrl = `https://api.findip.net/${clientIp}/?token=${process.env.FIND_IP_NET_KEY}`;

    const userApproxLocation = await axios.get(locationFromIPUrl);

    if (userApproxLocation) {
      userLocaleData = {
        coordinates: {
          lat: userApproxLocation?.data?.location?.latitude,
          lng: userApproxLocation?.data?.location?.longitude,
        },
        area: userApproxLocation?.data?.city?.names?.en,
      };
    }
  }

  console.log(userLocaleData);

  var useragent = uap(req.headers["user-agent"]);

  const IPinfo = {
    IPinfo: userLocaleData,
  };
  return respond(
    res,
    200,
    "success : fetched user device info success",
    IPinfo,
    200
  );
};

const updateUserProfile = async (req, res) => {
  const userDetails = req.body;
  const { id: userId, ...userInfo } = userDetails;

  //Use the main type to check if it is just an avatar update or a full update

  if (
    (userDetails.updateType === "main" &&
      (!userDetails.firstname || !userDetails.lastname)) ||
    !userId
  )
    return respond(res, 400, "Error: Bad Request", null, 400);

  // Profile data includes the following :

  //  First Name,
  //  Last Name
  //  Home Address,
  //  Gender ,
  //  Bio,
  //  Location,
  //  interest Type
  // Date of Birth
  //Avatar

  let currentUser = await User.findById(userId);

  if (userDetails.updateType === "main") {
    currentUser.firstname = userInfo?.firstname;
    currentUser.lastname = userInfo?.lastname;
    currentUser.homeaddress = userInfo?.homeaddress;
    currentUser.gender = userInfo?.gender;
    currentUser.interestType = userInfo?.interestType;
    currentUser.birthDate = userInfo?.birthDate;
  } else {
    currentUser.Avatar = userInfo?.avatar;
  }

  const updatedUser = await currentUser.save();

  if (!updatedUser)
    return respond(res, 409, "Error : Failed to Update User", null, 409);

  return respond(res, 200, "Success : User Profile Upldated", updatedUser, 200);
};

const getNotificationPreference = async (req, res) => {
  const { id: userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "Error : User Id not supplied" });
  }

  const user = await User.findById(userId);

  if (!user) return respond(res, 404, "User not Found", null, 404);

  const result = user.notifications;

  return res.status(200).json(result);
};

const updateUserNotificationsPreference = async (req, res) => {
  const userDetails = req.body;

  const { id: userId, ...userPreference } = userDetails;

  let detailsToUpdate = {};

  if (!userId) return respond(res, 400, "Error : Bad Request", null, 400);

  // Notification Preference  include the following :

  //  transaction,
  //  taskUpdates
  //   taskReminders,
  //   taskRecommendations ,
  //   matchingAlerts,
  //   taskHelpInfo,
  //  Newsletter

  Object.assign(detailsToUpdate, userDetails);

  const currentUser = await User.findById(userId);

  Object.keys(userPreference).map((key) => {
    if (key in currentUser.notifications) {
      currentUser.notifications[key] = userPreference[key];
    }
  });

  const updatedUser = await currentUser.save();

  if (!updatedUser)
    return respond(res, 409, "Error : Failed to Update User", null, 409);

  return respond(
    res,
    200,
    "Success : Notification Preference updated ",
    updatedUser.notifications,
    200
  );
};

const createPortfolio = async (req, res) => {
  const { id: userId, ...portfolioItems } = req.body;

  if (!userId) return respond(res, 400, "Error : Bad Request", null, 400);

  const currentUser = await User.findById(userId);

  if (!currentUser) return respond(res, 404, "Error:No user found", null, 404);

  if (currentUser.portfolio?.skills?.length > 10)
    return respond(res, 409, "Error : Skills limit reached", null, 409);

  let portfolioKeys = Object.keys(portfolioItems);

  portfolioKeys.map((key) => {
    if (key in currentUser.portfolio && key === "resume") {
      currentUser.portfolio.resume = portfolioItems.resume;
    }

    if (key in currentUser.portfolio && key === "skills") {
      currentUser.portfolio.skills = [
        ...currentUser.portfolio.skills,
        {
          ...portfolioItems.skills,
          experience: Number(portfolioItems?.skills?.experience),
        },
      ];
    }
  });
  console.log(currentUser.portfolio);

  const userWithCreatedSkill = await currentUser.save();

  if (!userWithCreatedSkill)
    return respond(res, 409, "Error : Failed to add portfolio item", null, 409);

  let response = userWithCreatedSkill.portfolio.skills;

  const result = response.at(-1);

  return respond(res, 200, "Success : User skills updated", result, 200);
};

const getPortfolio = async (req, res) => {
  const { id: userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "Error : User Id not supplied" });
  }

  const currentUser = await User.findById(userId);

  if (!currentUser)
    return respond(res, 404, "Error : User not Found", null, 404);

  const result = currentUser.portfolio;

  return respond(
    res,
    200,
    "Success : Portfolio fetch successfull",
    result,
    200
  );
};

const deletePortfolio = async (req, res) => {
  const { userId, itemToDelete } = req.body;

  if (
    !itemToDelete ||
    (itemToDelete !== "resume" && !req.body.skillId) ||
    !userId
  )
    return respond(res, 400, "Error : Bad Request", null, 400);

  const currentUser = await User.findById(userId);

  let itemForDelete;

  if (itemToDelete === "resume") {
    currentUser.portfolio.resume = "";
    itemForDelete = "resume";
  } else {
    itemForDelete = currentUser.portfolio.skills[Number(req.body.skillId)];

    const updatedSkillArray = currentUser.portfolio.skills.filter(
      (_, idx) => idx !== Number(req.body.skillId)
    );

    currentUser.portfolio.skills = updatedSkillArray;
  }

  const updatedUser = await currentUser.save();

  if (!updatedUser)
    return respond(
      res,
      409,
      `Error : Failed to delete ${
        typeof itemForDelete === "string" ? "resume" : itemForDelete.title
      }`,
      null,
      409
    );

  return respond(
    res,
    200,
    `Success : deleted ${
      typeof itemForDelete === "string"
        ? "resume"
        : `${itemForDelete.title} skill`
    },`,
    itemForDelete,
    200
  );
};

const createShowcaseItem = async (req, res) => {
  const { id: userId, ...field } = req.body;

  if (!userId || !field.url)
    return respond(res, 400, "Error : Bad Request", null, 400);

  const currentUser = await User.findById(userId);

  if (!currentUser) return respond(res, 404, "Error:No user found", null, 404);

  if (currentUser.showcase.items?.length >= 20)
    currentUser.showcase.canAddMore = false;

  if (currentUser.showcase.canAddMore === false)
    return respond(
      res,
      409,
      "Error : Exceeded maximum showcase items",
      null,
      409
    );

  currentUser.showcase.items.push(field);

  if (currentUser.showcase.items?.length > 10)
    currentUser.showcase.hasMore = true;

  const userWithUpdatedShowcase = await currentUser.save();

  if (!userWithUpdatedShowcase)
    return respond(res, 409, "Error : Failed to add showcase item", null, 409);

  return respond(
    res,
    200,
    "Success : User showcase item added ",
    userWithUpdatedShowcase.showcase,
    200
  );
};

const getShowCaseItems = async (req, res) => {
  const { id: userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "Error : User Id not supplied" });
  }

  const user = await User.findById(userId);

  if (!user) return respond(res, 404, "Error : User not Found", null, 404);

  const result = user.showcase;

  return res.status(200).json(result);
};

const deleteUserShowcaseItem = async (req, res) => {
  const { id: itemId, userId } = req.body;

  console.log(req.body);

  if (!itemId || !userId)
    return respond(res, 400, "Error : Bad Request", null, 400);

  const currentUser = await User.findById(userId);

  if (!currentUser)
    return respond(res, 404, "Error : User not Found", null, 404);

  let updatedShowcaseArray;
  let itemToDelete;

  if (currentUser.showcase.items.length > 0) {
    itemToDelete = currentUser.showcase.items[Number(itemId)];

    updatedShowcaseArray = currentUser.showcase.items.filter(
      (_, idx) => idx !== Number(itemId)
    );
  }

  currentUser.showcase.items = updatedShowcaseArray ?? [];

  if (currentUser.showcase.items?.length > 10)
    currentUser.showcase.hasMore = true;
  else {
    currentUser.showcase.hasMore = false;
  }

  if (currentUser.showcase.items?.length >= 20)
    currentUser.showcase.canAddMore = false;
  else {
    currentUser.showcase.canAddMore = true;
  }

  const updatedUser = await currentUser.save();

  if (!updatedUser)
    return respond(res, 409, "Error : Failed to delete item", null, 409);

  return respond(res, 200, "Success : Item deleted", itemToDelete, 200);
};

// const updateSingleUser =  async(req, res) => {
//     const
// })

module.exports = {
  getAllUsers,
  getSingleUser,
  getShowCaseItems,
  getNotificationPreference,
  updateUser,
  deleteUser,
  getUserSystemInfo,
  getPortfolio,
  updateUserProfile,
  updateUserNotificationsPreference,
  deleteUserShowcaseItem,
  createShowcaseItem,
  createPortfolio,
  deletePortfolio,
};
