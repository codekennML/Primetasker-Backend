const router = require("express").Router();
const reviewController = require("../controllers/review/reviewController");

router
  .route("/")
  .post(reviewController.createReview)
  .patch(reviewController.moderateReview);

module.exports = router;
