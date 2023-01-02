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
const Booking = require("./model/Booking");
const { bookings } = require("./config/data");

//Connect to MongoDB
connectDB();

app.use(logger);
app.use(cors(corsOptions));

app.use(cookieParser());
app.use(json()); //accepts json requests
app.use("/", static(path.join(__dirname, "public")));
app.use("/", require("./routes/root")); //Link to routing for index page

app.use(passport.initialize());

app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/tasks", require("./routes/taskRoutes"));
app.use("/bookings", require("./routes/bookingRoutes"));

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

app.use(errorHandler);
mongoose.connection.once("open", async () => {
  console.log("Connected to MongoDB");
  // await Booking.insertMany(bookings);
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

mongoose.connection.on("error", (err) => {
  logEvents(
    `${err.no} : ${err.code}\t${err.syscall}\t${err.hostname} `,
    "mongoErrLog.log"
  );
});
