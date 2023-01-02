const express = require("express");
const router = express.Router();
const tasksController = require("../controllers/tasksController");
const verifyJWT = require("../middleware/verifyJWT");

// router.use(verifyJWT);

router.route("/").get(tasksController.getAllTasks);
//   .patch(tasksController.updateTask)
//   .delete(tasksController.deleteTask);

// router.route("/:id").get(tasksController.getSingleTask);

module.exports = router;
