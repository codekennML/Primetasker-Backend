const express = require("express");
const router = express.Router();
const tasksController = require("../controllers/tasksController");
const verifyJWT = require("../middleware/verifyJWT");

router
  .route("/")
  .get(tasksController.getAllTasks)
  .patch(verifyJWT, tasksController.updateTask)
  .delete(verifyJWT, tasksController.deleteTask)
  .post(tasksController.createTask);

router.route("/:id").get(tasksController.getSpecificTask);
router.route("/user").get(tasksController.getUserTask);

module.exports = router;
