const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const bookingController = require("../controllers/bookingController");

// router.use(verifyJWT);
router.route("/").get(bookingController.getAllBookings);
router.route("/stats").get(bookingController.getBookingSummaryStats);

module.exports = router;
