const express = require("express");
const router = express.Router();
const userStat = require("../controllers/userStatController");
const verifyJWT = require("../middleware/verifyJWT");

// router.use(verifyJWT);

router.route("/top-taskers").get(userStat.getTopTaskers);
// router.route("/top-customers");

// router.route("/:id").get(userStat.getSingleUser);

module.exports = router;
