const express = require("express");
const router = express.Router();
const usersController = require("../controllers/usersController");
const verifyJWT = require("../middleware/verifyJWT");

// router.use(verifyJWT);

router
  .route("/")
  .get(usersController.getAllUsers)
  .patch(usersController.updateUser)
  .delete(usersController.deleteUser);

router.route("/ip").get(usersController.getUserSystemInfo);

// router.route("/:id").get(usersController.getSingleUser);

router
  .route("/profile")
  .get(usersController.getSingleUser)
  .post(usersController.updateUserProfile);

router
  .route("/portfolio")
  .get(usersController.getPortfolio)
  .post(usersController.createPortfolio)
  .delete(usersController.deletePortfolio);

router
  .route("/notification")
  .get(usersController.getNotificationPreference)
  .post(usersController.updateUserNotificationsPreference);

router
  .route("/showcase")
  .get(usersController.getShowCaseItems)
  .post(usersController.createShowcaseItem)
  .delete(usersController.deleteUserShowcaseItem);

module.exports = router;
