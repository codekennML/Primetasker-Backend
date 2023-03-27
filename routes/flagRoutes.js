const express = require("express");
const router = express.Router();
const flagController = require("../controllers/flagController");

router.route("/").post(flagController.createFlag);

module.exports = router;
