const router = require("express").Router();
const payController = require("../controllers/payments/PaystackController");

router
  .route("/paystack")
  .post(payController.startPayment)
  .get(payController.verifyPayment);

router.route("/:id").get(payController.getPaymentDetails);

router.route("/user/:id").get(payController.UserPaymentDetails);

module.exports = router;
