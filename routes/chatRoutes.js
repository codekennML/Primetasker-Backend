const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const chatController = require("../controllers/chats/chatController");

// router.use(verifyJWT);
router.route("/").get(chatController.getAllChats);

module.exports = router;
