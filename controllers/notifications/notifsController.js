const Notification = require("../../model/Notiification");
const emitter = require("../../helpers/Emitter");

const addNotification = async (data) => {
  const newNotification = await notification.create(data);
  if (newNotification) {
    return newNotification;
  } else {
    throw new Error("Failed to create Notification");
  }
};

emitter.on("notify", addNotification);

const getNotifications = async (req, res) => {
  const user = req.user;
  if (!user) {
    respond(res, 400, "Error : No user found", null, 400);
  }

  const myNotifications = await Notification.find({
    userId: user,
    read: false,
  });

  if (!myNotifications) {
    respond(res, 200, "No New Notifications", [], 200);
  }

  respond(
    res,
    200,
    "Success : Notification fetched success",
    myNotifications,
    200
  );
};

module.exports = { getNotifications };
