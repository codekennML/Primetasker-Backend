const { respond } = require("../helpers/response");
const Flag = require("../model/flags");
const Task = require("../model/Task");
const User = require("../model/User");

const createFlag = async (req, res) => {
  const flagFields = req.body;

  // const {type , createdBy, reason  } = flagFields

  if (flagFields.type || !flagFields.createdBy || !flagFields.reason) {
    respond(res, 400, "Error : Bad request - Incomplete flag data", null, 400);
  }

  const flag = await Flag.create(flagFields);

  if (!flag) {
    respond(res, 409, "Error : Failed to create Flag", null, 409);
  }

  let response;

  if (flagFields.type === "user") {
    var user = await User.findById(flagFields.user);
    if (!user) {
      respond(res, 404, "Error : User to flag not Found", null, 404);
    }
    user.isFlagged = true;
    user.flags.push(flag._id);
    if (user.flags > 7) {
      user.active = false;
    }
    const savedUserFlag = await user.save();
    if (!savedUserFlag) {
      respond(res, 409, "Error : Failed to flag user", null, 409);
    }
    response = savedUserFlag;
  } else if (flagFields.type === "task") {
    var task = await Task.findById(flagFields.task);
    if (!task) {
      respond(res, 404, "Error : task to flag not Found", null, 404);
    }
    task.isFlagged = true;
    task.flags.push(flag._id);
    if (task.flags > 3) {
      task.status = "Inactive";
    }
    const savedTaskFlag = await task.save();
    if (!savedTaskFlag) {
      respond(res, 409, "Error : Failed to flag task", null, 409);
    }
    response = savedtaskFlag;
  } else {
    var comment = await Comment.findById(flagFields.comment);
    if (!comment) {
      respond(res, 404, "Error : comment to flag not Found", null, 404);
    }
    comment.isFlagged = true;
    comment.flags.push(flag._id);
    if (comment.flags > 3) {
      comment.active = false;
    }
    const savedCommentFlag = await comment.save();
    if (!savedCommentFlag) {
      respond(res, 409, "Error : Failed to flag comment", null, 409);
    }
    response = savedCommentFlag;
  }

  response
    ? respond(res, 201, `${flagFields.type} flagged success`, response, 201)
    : null;
};

module.exports = { createFlag };
