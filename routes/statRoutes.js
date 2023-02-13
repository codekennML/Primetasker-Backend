const express = require("express");
const router = express.Router();
const taskerStatController = require("../controllers/stats/taskerStats");
const categoryStatController = require("../controllers/stats/categoryStats");
const customerStatController = require("../controllers/stats/customerStats");

router.route("/top-tasker").get(taskerStatController.getTopTaskers);
router.route("/top-categories").get(categoryStatController.getTopCategories);
router.route("/top-customers").get(customerStatController.getTopCustomers);

// console.log("Hi");

module.exports = router;
