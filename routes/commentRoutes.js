const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentsController");

router
  .route("/")
  .get(commentController.getAllComments)
  .post(commentController.createComment);

router.route("/task").get(commentController.getTaskComments);
router
  .route("/reply")
  .get(commentController.getCommentReplies)
  .post(commentController.createCommentReply);

module.exports = router;
