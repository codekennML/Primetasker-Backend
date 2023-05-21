const router = require("express").Router();
const taskController = require("../controllers/tasksController");
const verifyJWT = require("../middleware/verifyJWT");

router.route("/:id").get(verifyJWT, taskController.sendReleaseOTP);

module.exports = router;
