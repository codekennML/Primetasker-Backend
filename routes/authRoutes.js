const express = require("express");
const passport = require("passport");
const router = express.Router();
const authController = require("../controllers/authController");
const {
  createAccessToken,
  createRefreshToken,
} = require("../helpers/createAuthTokens");
const loginLimiter = require("../middleware/loginLimiter");
const verifyJWT = require("../middleware/verifyJWT");

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.PRIME_COMPANY_URL}/login`,
  }),
  function (req, res) {
    const currentUser = req.user;
    const { roles } = currentUser;

    const refreshToken = createRefreshToken(currentUser);
    console.log(refreshToken);

    res.cookie("jwt", refreshToken, {
      httpOnly: true, //accessible only by server
      secure: true, //https
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days cookie expiry
    });

    if (roles.includes("Admin")) {
      res.redirect(`${process.env.PRIME_COMPANY_URL}/admin-dashboard`);
    } else {
      res.redirect(`${process.env.PRIME_COMPANY_URL}/dashboard`);
    }
  }
);

router.route("/").post(loginLimiter, authController.login);

router.route("/signup").post(authController.signUp);

router.route("/refresh").get(authController.refresh);

router.route("/logout").post(authController.logout);

router.route("/reset-password/:token").put(authController.resetPassword);

router.route("/forgot-password").post(authController.forgotPassword);

module.exports = router;
