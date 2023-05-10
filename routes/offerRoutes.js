const express = require("express");
const router = express.Router();
const offerController = require("../controllers/OfferController");
const verifyJWT = require("../middleware/verifyJWT");
router
  .route("/")
  .get(offerController.getAllOffers)
  .post(offerController.createOffer)
  .patch(verifyJWT, offerController.updateOffer)
  .delete(verifyJWT, offerController.deleteOffer);

router.route("/task").get(offerController.getTaskOffers);

module.exports = router;
