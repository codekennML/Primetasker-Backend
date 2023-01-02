const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

router.route("/").get(bookingController.getAllBookings);
router.route("/stats").get(bookingController.getBookingSummaryStats);

module.exports = router;
