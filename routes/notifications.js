const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notifications/notifsController");

router.route("/").get(notificationController.getNotifications);

// router.route("/:id").delete(alertController.deleteAlert);

module.exports = router;
