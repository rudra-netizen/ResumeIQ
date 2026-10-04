const express = require("express");

const {
  register,
  login,
  logout,
  getMe,

  googleSignup,
  googleSignupCallback,
  completeGoogleSignup,
} = require("../controllers/auth.controller");

const authUser = require("../middlewares/auth.middleware");

const router = express.Router();

// Normal authentication

router.post("/register", register);

router.post("/login", login);

router.post("/logout", logout);

router.get("/me", authUser, getMe);

// Google OAuth signup

router.get("/google", googleSignup);

router.get("/google/callback", googleSignupCallback);

router.post("/google/complete-signup", completeGoogleSignup);

module.exports = router;
