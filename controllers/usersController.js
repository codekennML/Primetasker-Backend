const bcrypt = require("bcrypt");
const User = require("../model/User");
const Booking = require("../model/Booking");
const mongoose = require("mongoose");

const getAllUsers = async (req, res) => {
  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Filtering Results - >>>>>>>>>>>>>>>>>>>//

  // let query = [];

  const reqQuery = { ...req.query }; //Spread out the request array

  const excludeParams = ["sort", "page", "search"]; //fields to remove from the list to be filtered

  excludeParams.forEach((params) => delete reqQuery[params]); //exclude unwanted fields

  let filterOption;

  const roles = ["Admin", "Manager", "Tasker", "Customer"];
  const gender = ["Male", "Female"];

  console.log(reqQuery.filter);
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

  const searchTerm = req.query.search;
  if (searchTerm !== "undefined" && searchTerm !== "") {
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
  // console.log(userQuery);
  // query.push(userQuery);
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> --  Sorting Results - >>>>>>>>>>>>>>>>>//

  let fieldToSort;

  const sortTerm = req.query?.sort;
  if (sortTerm === "undefined" || sortTerm === "") {
    fieldToSort = { createdAt: -1 };
  } else {
    const string = sortTerm.toLowerCase().replaceAll(" ", "");
    fieldToSort = { [string]: 1 };
  }

  // >>>>>>>>>>>>>>>>>>>Creating the query Object >>>>>>>>>>>>>>>

  let query;
  query = Object.assign(userQuery, filterOption);

  // >>>>>>>>>>>>>>>>>>>>>>>>> - Paginating Results-  >>>>>>>>>>>>//

  const page = parseInt(req.query?.page) || 1; //Page being requested
  const pageSize = parseInt(req.query?.limit) || 20; //Number of items per page
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
  const { id } = req.params;

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
  const { email, id, roles } = req.body;

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

  // If app allows for username chabge , then check for duplicate username

  // const duplicateUser = await User.findOne({ username }).collation({ locale : 'en', strength : 2 }).lean().exec()
  // if (duplicateUser && duplicateUser?._id.toString() !== id){
  //     res.status(404).json({message : 'Username already taken'})
  // }

  // if(password){
  //   user.password =  await bcrypt.hash(password , 10)
  // }

  user.firstname = req.body?.firstname;
  user.lastname = req.body?.lastname;
  user.maritalstatus = req.body?.maritalstatus;
  user.birthDate = req.body?.birthDate;
  user.phone = req.body?.phone;
  user.gender = req.body?.gender;
  user.homeaddress = req.body?.homeaddress;
  user.roles = req.body?.roles;
  user.city = req.body?.city;
  user.stateOfOrigin = req.body?.stateOfOrigin;
  user.avatar = req.body?.avatar;
  user.documents = req.body?.documents;
  user.username = req.body?.username;
  user.taskContact = req.body?.taskContact;
  user.minTaskAmt = req.body?.minTaskAmt;
  user.taskState = req.body?.taskState;
  user.taskType = req.body?.taskType;
  user.bankDetails = req.body?.bankDetails;
  user.cardDetails = req.body?.cardDetails;

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

  const deletedUser = await userToDelete.deleteOne();

  const response = `User with ID ${deletedUser._id} deleted`;

  res.status(200).json({ message: response });
};
// const updateSingleUser =  async(req, res) => {
//     const
// })

module.exports = {
  getAllUsers,
  getSingleUser,
  updateUser,
  deleteUser,
};
