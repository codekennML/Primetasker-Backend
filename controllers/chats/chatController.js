const User = require("../../model/User");
const Chat = require("../../model/Chat");

const getAllChats = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(403).json({ message: "Forbidden" });
  }

  var chat = await Chat.find({
    users: { $elemMatch: { $eq: user } },
  })
    .populate([
      { path: "users", select: "firstname lastname avatar" },
      { path: "latestMessage" },
    ])
    .sort({ updatedAt: -1 });

  chat = await User.populate(chat, {
    path: "latestMessage.sender",
    select: "firstname lastname avatar",
  });
  // console.log(chat);
  if (chat.length > 0) {
    return res.json(chat);
  } else {
    return res.status(404).json({ message: "No chats found" });
  }
};

const getIndividualChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "Chat history not Found.Please Refresh",
    });
  }
  //If there is a chat between these two, find it N:B Two users will only ever have one chat between them, this one chat will hold all the messages for their conversation
  var isChat = await Chat.find({
    $and: {
      users: { $elemMatch: { $eq: userId } },
      users: { $elemMatch: { $eq: req.user } },
    },
  }).populate([
    { path: "users", select: "-password" },
    { path: "latestMessage" },
  ]);

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "firstname, lastname, avatar",
  });

  if (isChat.length > 0) {
    return res.json(isChat[0]);
  } else {
    //Create a new chat if the currently logged in user has clicked on a new profile in his DM
    var newChat = {
      users: [req.user, userId],
    };
    const newCreatedChat = await Chat.create(newChat);

    //Send the created chat to the current logged in user , N:B Chat will be empty since its just created

    const ourChat = await Chat.findOne({ _id: newCreatedChat });

    return res.status(200).json(ourChat);
  }
};

module.exports = { getAllChats, getIndividualChat };
