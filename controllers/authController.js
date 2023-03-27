const User = require("../model/User");
const jwt = require("jsonwebtoken");
const {
  createRefreshToken,
  createAccessToken,
} = require("../helpers/createAuthTokens");
const bcrypt = require("bcrypt");
const { sendMail } = require("../middleware/mailer");
const crypto = require("crypto");
const ResetToken = require("../model/ResetToken");
// const { ifError } = require("assert");

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> -- SignUp -- >>>>>>>>>>>>>>>>>>>//
//@desc signUp
//@route POST /auth
//access public

const signUp = async (req, res) => {
  const { email, password, role, canAddUsers } = req.body;
  //role is the role sent from the frontend
  if (!email || !password) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  // Check if the email exists
  const emailExists = await User.findOne({ email })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  // Return an  email taken error response if email exists
  if (emailExists) {
    res.status(409).json({ message: "E-mail already exists" });
  }

  //Check if the person creating the user is an admin or a new person to be onboarded

  let userRoles;
  if (role && canAddUsers) {
    userRoles = role;
  } else {
    userRoles = "Guest";
  }

  //  Hash the password
  const hashedPwd = await bcrypt.hash(password, 10);

  //Create user email verification code to send in email and save in DB
  // const emailVerifyCode = Math.random().substring(2, 8);
  // Create userObject to save in DB

  const userObject = {
    email,
    password: hashedPwd,
    roles: userRoles,
    // mailVerifyCode: verifyCode,
  };

  // Create the user in the DB and assign to  user

  const user = await User.create(userObject);
  // console.log(user);

  const createdUserDetails = {
    templateId: process.env.PRIME_SIGNUP_MAIL_ID,
    sent_From: process.env.PRIME_MAIL_ADDRESS,
    sent_To: user.email,
    params: { name: user.email },
  };

  if (user) {
    // sendMail(createdUserDetails);
    return res.status(201).json({ message: "Account created", status: 201 });
  } else {
    return res.status(400).json({ message: "Invalid User Details" });
  }
};

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> -- LOGIN FUNCTIONALITY -- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  //Check for email and password not supplied
  if (!email || !password) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  //Check that user exists and isActive
  const currentUser = await User.findOne({ email }).exec();

  if (!currentUser || !currentUser.active) {
    return res.status(401).json({ message: "Invalid email or Password" });
  }

  //Check password and compare with database password
  const match = await bcrypt.compare(password, currentUser.password);
  // console.log(match);
  if (!match) {
    return res.status(401).json({
      message: "Invalid email or Password ",
    });
  }

  // Create access token
  const token = createAccessToken(currentUser);

  //Create refreshToken
  const refreshToken = createRefreshToken(currentUser);

  // Create secure cookie with refreshToken
  res.cookie("jwt", refreshToken, {
    httpOnly: true, //accessible only by server
    secure: true, //https
    sameSite: "None",
    maxAge: 10 * 60 * 1000, // 24hrs  cookie expiry
  });
  console.log(token);
  return res.json({ token, status: 200 });
};

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  FORGOT PASSWORD  FUNCTIONALITY  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//@desc forgotPassword
//@route POST /auth/forgot-password
//access public

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  // console.log(req.body);

  if (!email) {
    return res.status(400).json({
      message: "E-mail is  required",
    });
  }

  // Check if the email exists
  const existingUser = await User.findOne({ email })
    .collation({ locale: "en", strength: 2 }) //account for case-sensitivity and match all
    .lean()
    .exec();

  if (!existingUser) {
    return res.status(404).json({ message: "User Not Found" });
  }

  const token = await ResetToken.findOne({ user: existingUser._id }); //check if user already has an expired token and delete it
  if (token) {
    await token.deleteOne();
  }

  const resetToken = crypto.randomBytes(32).toString("hex") + existingUser._id; //concatenate userId to random string to create unique token

  //Hash the resetToken
  const hashedResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  await new ResetToken({
    user: existingUser._id,
    token: hashedResetToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * (60 * 1000), //expires in 10mins
  }).save();

  const resetUrl = `${process.env.PRIME_COMPANY_URL}/password-reset/${resetToken}`;

  const forgotMailDetails = {
    templateId: process.env.PRIME_FORGOT_MAIL_ID, // ID of template in Postmark
    sent_From: process.env.PRIME_MAIL_ADDRESS,
    sent_To: existingUser.email,
    params: {
      name: existingUser.email,
      reset_url: resetUrl,
      company: process.env.PRIME_COMPANY_NAME,
    },
  };

  sendMail(forgotMailDetails);

  return res.status(200).json({
    message: resetUrl,
    // "We've sent you a link to reset your details.Please check your e-mail ",
  });
};

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  FORGOT PASSWORD  FUNCTIONALITY  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//@desc resetPassword
//@route POST /auth/reset-password
//access private

const resetPassword = async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  if (!password) {
    return res.status(400).json({
      message: "Password is  required",
    });
  }

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const receivedTokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Check if the equivalent of the received token hash exists in our DB && is not expired
  const existingToken = await ResetToken.findOne({
    token: receivedTokenHash,
    expiresAt: { $gt: Date.now() },
  })
    .lean()
    .exec();

  if (!existingToken) {
    return res.status(404).json({
      message: "Invalid or expired token. Please reset your password again",
    });
  }

  const user = await User.findOne({ _id: existingToken.user });
  const hashedPwd = await bcrypt.hash(password, 10);
  user.password = hashedPwd;
  await user.save();

  const resetMailAlert = {
    templateId: process.env.PRIME_RESET_MAIL_ID, // ID of reset mail emplate in Postmark
    sent_From: process.env.PRIME_MAIL_ADDRESS,
    sent_To: user.email,
    params: {
      company: process.env.PRIME_COMPANY_NAME,
      changePasswordUrl: `${process.env.PRIME_COMPANY_URL}/forgot-password`, //forgot password if password request was createdby  a criminal
    },
  };

  sendMail(resetMailAlert);

  return res.status(200).json({
    message: "Password changed successfully.",
  });
};

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> REFRESH TOKEN ON EXPIRY FUNCTIONALITY >>>>>>>>>>>>>>>>>>>>>>>>>>

//@desc refreshToken
//@route GET /auth/refresh
//access Public

const refresh = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    return res.status(401).json({ message: "Unauthorized " });
  }

  const refreshToken = cookies.jwt;

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          message: "Forbidden ",
        });
      }

      const currentUser = await User.findOne({ email: decoded.email });

      if (!currentUser) {
        return res.status(401).json({ message: "unauthorized hey" });
      }

      const token = jwt.sign(
        {
          UserInfo: {
            userId: currentUser._id,
            email: currentUser.email,
            roles: currentUser.roles,
            username: currentUser?.username,
            avatar: currentUser.avatar,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "10m",
        }
      );

      res.json({ token });
    }
  );
};

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> LOGOUT FUNCTIONALITY  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//@desc logout
//@route POST /auth/logout
//@access Public . clear cookies if exist

const logout = async (req, res) => {
  //Check for cookie in request
  const cookies = req.cookies;
  // console.log(cookies);
  //No cookie, send status of 204
  if (!cookies?.jwt) {
    return res.sendStatus(204); //No content
  }

  // if cookie , clear cookie and logout
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });

  res.json({
    message: "Cookie cleared ",
  });
};

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

module.exports = {
  login,
  refresh,
  logout,
  forgotPassword,
  signUp,
  resetPassword,
};
