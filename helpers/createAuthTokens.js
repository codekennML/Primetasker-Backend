const jwt = require("jsonwebtoken");

const createAccessToken = (currentUser) => {
  const accessToken = jwt.sign(
    {
      UserInfo: {
        userId: currentUser._id,
        username: currentUser?.username,
        email: currentUser.email,
        roles: currentUser.roles,
        avatar: currentUser.Avatar ?? currentUser.avatar,
        verified: currentUser.verification,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "5m",
    }
  );
  return accessToken;
};

// Create refresh token

const createRefreshToken = (currentUser, expiry) => {
  const timeBeforeExpires = expiry ? expiry : "20m";
  const refreshToken = jwt.sign(
    { email: currentUser.email },

    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: timeBeforeExpires,
    }
  );
  return refreshToken;
};

module.exports = { createAccessToken, createRefreshToken };
