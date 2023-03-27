const Chat = require("../../model/Chat");
const Message = require("../../model/Message");
const User = require("../../model/User");

const sendMessageToChat = async (req, res) => {
  const { messageText, files, chatId } = req.body;
  console.log(messageText);
  //Ensure the sender has sent either a message , a message and a file or a file only
  if ((!messageText || files.length < 1) && !chatId) {
    return res.status(400).json({ message: "Invalid Message sent" });
  }

  //instantiate new message object
  var newMessage = {
    sender: req.user,
    files: files ? files : null,
    body: messageText,
    chat: chatId,
  };
  //Create message in DB
  var message = await Message.create(newMessage);

  //the newly created message is returned as a reponse from the create methid from the prev step. Populate the referential fields
  message = await message.populate([
    { path: "sender", select: "firstname, lastname,avatar" },
    { path: "chat" },
  ]);

  message = await User.populate(message, {
    path: "chat.users",
    select: "firstname, lastname, avatar",
  });

  //Update the chat between the two users with the message that was just created using the chat id sent by the user
  await Chat.findByIdAndUpdate(chatId, {
    latestMessage: message,
  });
  //Send the message to the receipient and back to the sender
  return res.status(200).json(message);
};

const getMessagesForChat = async (req, res) => {
  const { chatId } = req.params;
  // console.log(chatId);

  var messages = await Message.find({ chat: chatId }).populate([
    { path: "sender", select: "firstname, lastname, avatar" },
    { path: "chat" },
  ]);
  // console.log(messages);
  return res.status(200).json(messages);
};

module.exports = { sendMessageToChat, getMessagesForChat };
