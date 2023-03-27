const rateLimit = require("express-rate-limit");
const { logEvents } = require("./logger");

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 1 minute
  max: 5, //Limit address to 5 login requests per window per minute
  message: {
    message: "Too many login attempts , try again after 15minutes ",
  },
  handler: (req, res, next, options) => {
    logEvents(
      `Too many login attempts : ${options.message.message}\t${req.method}\t${req.url}\t${req.headers.origin}`,
      `errLog.log`
    );
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = loginLimit;
