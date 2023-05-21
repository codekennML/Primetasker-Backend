const mongoose = require("mongoose");
const { respond } = require("../../helpers/response");
const Task = require("../../model/Task");
const { Schema } = mongoose;

const createReview = async (req, res) => {
  const { initiator, receiver, message, taskId, rating } = req.body;

  if (!receiver || !initiator || !message || ~!taskId || !rating)
    return respond(res, 400, "Bad Request", null, 400);

  const result = handleReviewCreate(
    initiator,
    receiver,
    message,
    rating,
    taskId
  );

  if (result.error) respond(res, 409, `${result.error}`, null, 409);

  respond(res, 200, `${result.message}`, null, 200);
};

const moderateReview = async (req, res) => {
  const { reviewId } = req.query;

  if (!reviewId) return respond(res, 400, "Bad Request", null, 400);

  const review = await Review.findById(reviewId);

  if (!review) return respond(res, 404, "Review Not Found", null, 404);

  review.moderated = true;

  const updatedReview = await review.save();

  if (!updatedReview) return respond(res, 409, "Operation Failed", null, 409);

  return respond(res, 200, "Operation Success", updatedReview, 200);
};

module.exports = { createReview, moderateReview };
