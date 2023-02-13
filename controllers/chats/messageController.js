const Chat = require("../../model/Chat");
const Message = require("../../model/Message");
const User = require("../../model/User");

const sendMessageToChat = async (req, res) => {
  //   console.log(req.body);
  const { messageText, files, chatId } = req.body;
  //   console.log(messageText, files, chatId);

  if ((!messageText || files.length < 1) && !chatId) {
    return res.status(400).json({ message: "Invalid Message sent" });
  }
  var newMessage = {
    sender: req.user,
    files: files ? files : null,
    body: messageText ? messageText : null,
    chat: chatId,
  };

  var message = await Message.create(newMessage);
  message = await message.populate([
    { path: "sender", select: "firstname, lastname,avatar" },
    { path: "chat" },
  ]);
  message = await User.populate(message, {
    path: "chat.users",
    select: "firstname, lastname, avatar",
  });
  await Chat.findByIdAndUpdate(chatId, {
    latestMessage: message,
  });
  return res.status(200).json(message);
};

const getMessagesForChat = async (req, res) => {
  const { chatId } = req.body;

  var messages = await Message.find({ chatId: chatId }).populate([
    { path: "sender", select: "firstname, lastname, avatar" },
    { path: "chat" },
  ]);
  return res.status(200).json(messages);
};

module.exports = { sendMessageToChat, getMessagesForChat };
