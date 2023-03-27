const express = require("express");
const router = express.Router();
const offerController = require("../controllers/OfferController");

router
  .route("/")
  .get(offerController.getAllOffers)
  .post(offerController.createOffer)
  .patch(offerController.updateOffer)
  .delete(offerController.deleteOffer);

module.exports = router;
