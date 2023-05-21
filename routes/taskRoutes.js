const express = require("express");
const router = express.Router();
const tasksController = require("../controllers/tasksController");
const verifyJWT = require("../middleware/verifyJWT");

router
  .route("/")
  .get(tasksController.getAllTasks)
  .patch(verifyJWT, tasksController.updateTaskBudget)
  // .delete(verifyJWT, tasksController.deleteTask)
  .post(tasksController.createTask);

router.route("/assign").post(verifyJWT, tasksController.assignTask);

router
  .route("/user/")
  .get(verifyJWT, tasksController.getUserTask)
  .post(verifyJWT, tasksController.cancelTask)
  .patch(verifyJWT, tasksController.lockBudget);

router
  .route("/complete")
  .get(verifyJWT, tasksController.markCompleteAndRequestPayment)
  .post(verifyJWT, tasksController.markCompleteAndReleasePayment);

router
  .route("/:id")
  .get(tasksController.getSpecificTask)
  .patch(verifyJWT, tasksController.appealTask);

module.exports = router;
