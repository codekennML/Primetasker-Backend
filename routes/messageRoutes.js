const express = require("express");
const router = express.Router();
const messageController = require("../controllers/chats/messageController");

router.route("/").post(messageController.sendMessageToChat);
router.route("/getMessages/:chatId").get(messageController.getMessagesForChat);

module.exports = router;
