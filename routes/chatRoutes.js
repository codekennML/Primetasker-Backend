const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chats/chatController");

// router.use(verifyJWT);
router.route("/").get(chatController.getAllChats);
router.route("/getChat").get(chatController.getIndividualChat);

module.exports = router;
