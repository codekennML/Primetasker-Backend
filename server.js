require("dotenv").config();
const express = require("express");
const app = express();
require("express-async-errors");
const { static, json } = express;
const path = require("path");
const cookieParser = require("cookie-parser");
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const mongoose = require("mongoose");
const connectDB = require("./config/dbConn");
require("./config/passportGoogle");
const passport = require("passport");
const PORT = process.env.PORT || 3500;
// const { createServer } = require("http");
const bodyParser = require("body-parser");
const emitter = require("./helpers/Emitter");

// const Comment = require("./model/comments");
// const { comments } = require("./config/data/Comments");
// const Offer = require("./model/Offers");
// const { offers } = require("./config/data/offers");
const verifyJWT = require("./middleware/verifyJWT");

//Connect to MongoDB
connectDB();

// const httpServer = createServer(app);
// const io = new Server(httpServer, {
//   pingTimeout: 60000, //60s
//   cors: corsOptions,
// });

app.use(logger);
app.use(cors(corsOptions));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/", static(path.join(__dirname, "public")));
app.use("/", require("./routes/root")); //Link to routing for index page
app.use("/comments", require("./routes/commentRoutes"));

app.get("/api/sse", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // send the SSE stream to the frontend
  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // listen for new post events and send them to the SSE stream
  emitter.on("new-task", sendSSE);

  // close the SSE stream when the frontend disconnects
  req.on("close", () => {
    emitter.off("new-task", sendSSE);
  });
});

app.use("/tasks", require("./routes/taskRoutes"));
app.use("/categories", require("./routes/categoryRoutes"));

app.use("/offers", require("./routes/offerRoutes"));
app.use("/alerts", require("./routes/alertRoutes"));
app.use("/users", require("./routes/userRoutes"));

app.use(passport.initialize());
app.use("/auth", require("./routes/authRoutes"));
// app.use(verifyJWT);
app.use("/chats", require("./routes/chatRoutes"));
app.use("/messages", require("./routes/messageRoutes"));
app.use("/bookings", require("./routes/bookingRoutes"));
app.use("/stats", require("./routes/statRoutes"));
app.use("/flags", require("./routes/flagRoutes"));
app.use("/notifications", require("./routes/notifications"));
app.use("/reviews", require("./routes/reviewRoutes"));
app.use("/pay", require("./routes/PaymentRoutes"));
app.use("/otp", require("./routes/otpRoutes"));

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({
      message: "404 Not Found",
    });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

// try {
//   Comment.insertMany(comments);
// } catch (err) {
//   console.log(err);
// }

// try {
//   Offer.insertMany(offers);
// } catch (err) {
//   console.log(err);
// }

// io.on("connection", (socket) => {
//   console.log("a user connected");

//   socket.on("join chat", (chatId) => {
//     socket.join(chatId);
//     console.log("user Joined room", chatId);
//   });
//   socket.on("new_message", (message) => {
//     console.log("chat received");
//     let chat = message.chat;
//     if (!chat.users) return console.log("chat has no users");

//     chat.users.forEach((user) => {
//       // console.log(user._id, chat._id, "Message Came");

//       if (user._id !== message.sender._id) {
//         socket.to(chat._id).emit("message_received", message);
//       }
//     });
//     console.log("message received");
//   });
//   socket.on("disconnect", () => {
//     console.log("user disconnected");
//   });
// });

app.use(errorHandler);
mongoose.connection.once("open", async () => {
  console.log("Connected to MongoDB");

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

mongoose.connection.on("error", (err) => {
  logEvents(
    `${err.no} : ${err.code}\t${err.syscall}\t${err.hostname} `,
    "mongoErrLog.log"
  );
});
