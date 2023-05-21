const router = require("express").Router();
const payController = require("../controllers/payments/PaystackController");
const verifyJWT = require("../middleware/verifyJWT");

router
  .route("/paystack")
  .post(verifyJWT, payController.startPayment)
  .get(payController.verifyPayment);

router.route("/:id").get(payController.getPaymentDetails);

router.route("/user/:id").get(payController.UserPaymentDetails);

module.exports = router;
