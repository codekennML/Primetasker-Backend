const express = require("express");
const router = express.Router();
const tasksController = require("../controllers/tasksController");
const verifyJWT = require("../middleware/verifyJWT");

router
  .route("/")
  .get(tasksController.getAllTasks)
  .patch(verifyJWT, tasksController.updateTaskBudget)
  .delete(verifyJWT, tasksController.deleteTask)
  .post(tasksController.createTask);

router.route("/assign").post(tasksController.assignTask);

router.route("/user/").get(verifyJWT, tasksController.getUserTask);

router.route("/:id").get(tasksController.getSpecificTask);

module.exports = router;
