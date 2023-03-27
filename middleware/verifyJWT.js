const jwt = require("jsonwebtoken");
const { respond } = require("../helpers/response");

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Session has expired, Please login again",
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) respond(res, 403, "403 Forbidden. JWT mismatch", null);
    req.user = decoded.UserInfo.userId;
    req.roles = decoded.UserInfo.roles;
    console.log(req.user);
    next();
  });
};

module.exports = verifyJWT;
