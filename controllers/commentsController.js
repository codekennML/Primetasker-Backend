const { respond } = require("../helpers/response");
const Comment = require("../model/Comments");
const Task = require("../model/Task");
const User = require("../model/User");

const createComment = async (req, res) => {
  const { id: taskId, commentDetails } = req.body;
  const { body, files } = commentDetails;

  //   console.log(taskId, commentDetails);
  //Comment details has same structure as the comment model

  if (!taskId) {
    respond(res, 400, "Bad Request. Missing task Id", null);
  }

  if (!body && files.length < 1) {
    respond(res, 400, "Bad Request. Missing comment Details", null);
  }

  let comment = await Comment.create(commentDetails);
  // console.log(comment);
  if (!comment) {
    respond(res, 409, "Failed to create comment", null, 409);
  }

  let commentTask = await Task.findById(taskId);

  if (!commentTask) {
    respond(res, 404, "Error : parent task for comment not found", null, 404);
  }

  commentTask.comments.push(comment);
  if (commentTask.comments.length > 30) {
    commentTask.hasMoreComments = true;
  }

  commentTask.comments
    .sort((a, b) => b.getTimestamp - a.getTimestamp())
    .slice(0, 30);

  const modifiedTask = await commentTask.save();

  if (!modifiedTask) {
    respond(res, 409, "Failed to update task with comment", null, 409);
  }

  respond(res, 201, "comment created success", comment, 201);
};

const createCommentReply = async (req, res) => {
  const { commentDetails } = req.body;
  console.log(req.body);

  const { parent, createdBy, taskId } = commentDetails;

  if (!parent || !createdBy || !taskId) {
    respond(res, 400, "Error : Bad Request", null, 400);
  }

  let replyParent = await Comment.findById(parent);

  if (!replyParent) {
    respond(res, 404, "Error : No parent found for reply", null, 404);
  }

  const newReply = await Comment.create(commentDetails);

  console.log(replyParent);

  replyParent.isParent = true;
  replyParent.replies.push(newReply._id);

  const parentSaved = await replyParent.save();
  console.log(replyParent);

  if (!parentSaved) {
    respond(res, 404, "Error: Failed to update parent", null, 404);
  }
  respond(res, 201, "Reply created success", newReply, 201);
};
// const editComment = async (req, res) => {

//   const { id: commentId, newComment  } = req.body;
//   if (!commentId) {
//     respond(res, 400, "Bad Request , Missing comment Id");
//   }

//   const commentToEdit = await Comment.findById(commentId)

//   Object.keys(newComment).forEach(key => {
//     if (key in commentToEdit){
//         commentToEdit[key] = newComment[key]
//     }
// })

//     const edit =  await commentToEdit.save()
//     if(!edit){
//         respond(res, 400, "Failed to update Comment", null, 400 )
//     }
// };

const getAllComments = async (req, res) => {
  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Filtering Results - >>>>>>>>>>>>>>>>>>>//

  //Create a query array that we will push further conditions to, based on the received url params
  let query = [];

  const reqQuery = { ...req.query }; //Spread out the request params array

  console.log(req.query.page);
  const excludeParams = ["sort", "page", "search"]; //fields to remove from the list to be filtered

  excludeParams.forEach((params) => delete reqQuery[params]); //exclude unwanted fields

  let filterOption;

  const filter = reqQuery.filter;

  switch (true) {
    default:
      filterOption = {};
  }

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Searching Results - >>>>>>>>>>>>>>>>>>>>>//

  let commentQuery;

  const searchTerm = req.query?.search;

  if (searchTerm !== undefined && searchTerm !== "") {
    const isObjectId = searchTerm.match(/^[0-9a-fA-F]{24}$/); //Check if the query is a comment id
    if (isObjectId) {
      commentQuery = { _id: mongoose.Types.ObjectId(searchTerm) }; //If its object Id, search in id field
    } else if (!isObjectId) {
      const queryRegex = new RegExp(searchTerm, "i");
      (searchString = {
        $or: [
          { "creator.firstname": queryRegex },
          { "creator.lastname": queryRegex },
          { budget: queryRegex },
          { title: queryRegex },
        ],
      }),
        (commentQuery = searchString);
    }
  } else {
    commentQuery = {};
  }

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> --  Sorting Results - >>>>>>>>>>>>>>>>>//

  let fieldToSort;

  const commentSortField = req.query?.sort;
  if (commentSortField === undefined || commentSortField === "") {
    fieldToSort = { createdAt: -1 };
  } else {
    const string = commentSortField.toLowerCase().replaceAll(" ", "");
    fieldToSort = { [string]: 1 };
  }

  // >>>>>>>>>>>>>>>>>>>>>>>>> - Paginating Results-  >>>>>>>>>>>>//

  const page = parseInt(req.query?.page) || 1; //Page being requested
  const pageSize = parseInt(req.query?.limit) || 10; //Number of items per page
  const docsToSkip = (page - 1) * pageSize; //Number of items to skip on page
  const totalResultCount = await Comment.countDocuments(query);
  const pages = Math.ceil(totalResultCount / pageSize);

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Populate Query Array >>>>>>>>>>>>>>>>>>>>>>>.
  req?.roles?.includes("admin")
    ? (commentQuery = {
        ...commentQuery,
        userDeleted: { $in: [true, false] },
        status: { $in: [true, false] },
      })
    : (commentQuery = {
        ...commentQuery,
        userDeleted: false || undefined,
        disabled: { $eq: false },
      });

  //Match stage
  query.push({
    $match: commentQuery,
  });
  //Lookup Stage
  query.push(
    {
      //Lookup query to find the creator of each comment based on the creator ref to the User table
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

  console.log(query);

  // >>>>>>>>>>>>>>>>>> Returning Response  >>>>>>>>>>>>>>>>>>>>//

  const comments = await Comment.aggregate(query);

  res.status(200).json({
    message: "Comments fetched successfully",
    data: {
      comments: comments,
      meta: {
        page: page,
        pages: pages,
        totalDocs: totalResultCount,
      },
    },
  });
};

//   const getUserComment = async (req, res) => {
//     const userId = req.body;

//     if (!userId) {
//       return res.status(403).json({ message: "Unauthorized" });
//     }

//     const comments = await Comment.findById({ creator: userId });

//     if (!comments) {
//       respond(res, 404, "No comments found", null);
//     }
//     respond(res, 200, "comments fetched success", comments);
//   };

const getTaskComments = async (req, res) => {
  const { taskId, page } = req.query;

  console.log(taskId, page);

  console.log(req.query);

  if (!taskId) {
    respond(res, 400, "Bad Request, missing task id", null, 400);
  }

  //Fetching second page as we have already sent first page to the frontend with the tasks
  const currPage = parseInt(page) || 1;
  const pageSize = 10;
  const docsToskip = (currPage - 1) * pageSize;

  const comments = await Comment.find({ taskId, hasParent: false })
    .populate([
      { path: "createdBy", select: "Avatar firstname lastname " },
      {
        path: "replies",
        populate: {
          path: "createdBy",
          model: User,
          select: "Avatar firstname lastname ",
        },
        limit: 30, //we will oly dispaly a maximum of 30 replies per comment
      },
    ])
    .sort({ createdAt: -1 })
    .skip(docsToskip)
    .limit(10);

  if (!comments) {
    respond(res, 404, "Error : task not found", null, 404);
  }

  const pages = Math.ceil(comments.length / pageSize);

  const result = {
    comments: comments,
    meta: {
      page: page,
      pages: pages,
    },
  };

  respond(res, 200, "comment fetched success", result, 200);
};

const getCommentReplies = async (req, res) => {
  const { commentId, page } = req.query;

  console.log(req.query);
  // console.log(taskId, page);

  // console.log(req.query);

  if (!commentId) {
    respond(res, 400, "Bad Request, missing comment id", null, 400);
  }

  //Fetching second page as we have already sent first page to the frontend with the tasks
  const currPage = parseInt(page) || 1;
  const pageSize = 10;
  const docsToskip = (currPage - 1) * pageSize;

  let comment = await Comment.findById(commentId)
    .select("replies")
    .populate({
      path: "replies",
      select: "createdBy body files createdAt",
      options: {
        sort: { createdAt: -1 },
        skip: docsToskip,
        limit: pageSize,
      },
      populate: {
        path: "createdBy",
        model: User,
        select: "firstname lastname Avatar",
      },
    });

  if (!comment) {
    respond(res, 404, "Error : parent comment not found", null, 404);
  }

  // let replies = await User.populate(comment, {
  //   path: "replies.createdBy",
  //   select: "firstname, lastname, Avatar",
  // });

  const pages = Math.ceil(comment.replies.length / pageSize);

  const result = {
    replies: comment.replies,
    meta: {
      page: page,
      pages: pages,
    },
  };

  respond(res, 200, "comment fetched success", result, 200);
};

const getSpecificComment = async (req, res) => {
  const { id: commentId } = req.params;

  if (!commentId) {
    respond(res, 400, "Bad Request, Please try again");
  }
  console.log(commentId);
  //Set comments to Details :: TODO

  var comment = await Comment.findById(commentId);

  if (!comment) {
    respond(res, 404, "Error: Comment does not exist", null, 404);
  }

  respond(res, 200, "Comments fetched success", comment, 200);
};

//Only admins can update comments and it is to moderate , not edit
const updateComment = async (req, res) => {
  if (!req.roles.includes("admin")) {
    respond(res, 403, "403 Forbidden", null, 403);
  }
  const { id: commentId, fields } = req.body;

  if (!commentId) {
    respond(res, 400, null, "Bad Request");
  }

  var comment = await Comment.findById(commentId);
  if (!comment) respond(req, res, 404, null, "Comment not Found");

  Object.keys(fields).map((key) => {
    if (key in comment) {
      comment[key] = fields[key];
    }
  });

  const updatedComment = await comment.save();

  if (!updatedComment) {
    respond(res, 400, "Failed to update comment", null);
  }

  respond(res, 200, "comment update success", updatedComment);
};

const deleteComment = async (req, res) => {
  const { id: commentId } = req.body;

  if (!commentId) {
    respond(res, 400, "Bad Request, missing comment id", null);
  }

  const commentToDelete = await Comment.findById(commentId);

  if (!commentToDelete) {
    respond(res, 404, "Error : Comment Not Found", null);
  }

  commentToDelete.userDeleted = true;
  commentToDelete = commentToDelete.save();

  if (!commentToDelete) {
    respond(res, 400, "Failed to delete comment. Please try again ", null);
  }

  respond(res, 200, "Your comment has been deleted", null);
};

module.exports = {
  createComment,
  getCommentReplies,
  createCommentReply,
  getAllComments,
  getTaskComments,
  getSpecificComment,
  updateComment,
  deleteComment,
};
