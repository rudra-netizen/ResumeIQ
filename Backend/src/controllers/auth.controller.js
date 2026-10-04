const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const tokenBlacklistModel = require("../models/blacklist.model");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL,
);

// ======================================================
// JWT COOKIE
// ======================================================

function setTokenCookie(res, user) {
  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

// ======================================================
// NORMAL REGISTER
// ======================================================

async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        message: "Username must be at least 3 characters",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await userModel.findOne({
      $or: [{ username }, { email: email.toLowerCase() }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      authProvider: "local",
    });

    return res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Register Error:", error);

    return res.status(500).json({
      message: "Registration failed",
    });
  }
}

// ======================================================
// NORMAL LOGIN
// ======================================================

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await userModel.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        message:
          "This account does not have a password. Please complete signup again.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    setTokenCookie(res, user);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Login Error:", error);

    return res.status(500).json({
      message: "Login failed",
    });
  }
}

// ======================================================
// LOGOUT
// ======================================================

async function logout(req, res) {
  try {
    const token = req.cookies?.token;

    if (token) {
      await tokenBlacklistModel.create({
        token,
      });
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    console.log("Logout Error:", error);

    return res.status(500).json({
      message: "Logout failed",
    });
  }
}

// ======================================================
// GET ME
// ======================================================

async function getMe(req, res) {
  try {
    const user = await userModel.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.log("Get Me Error:", error);

    return res.status(500).json({
      message: "Unable to get user",
    });
  }
}

// ======================================================
// GOOGLE OAUTH - START
// ======================================================

function googleSignup(req, res) {
  try {
    const state = jwt.sign(
      {
        purpose: "google-signup",
        nonce: crypto.randomBytes(16).toString("hex"),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m",
      },
    );

    const authorizationUrl = googleClient.generateAuthUrl({
      access_type: "online",

      scope: ["openid", "email", "profile"],

      response_type: "code",

      state,
    });

    return res.redirect(authorizationUrl);
  } catch (error) {
    console.log("Google OAuth Start Error:", error);

    return res.status(500).json({
      message: "Unable to start Google signup",
    });
  }
}

// ======================================================
// GOOGLE OAUTH - CALLBACK
// ======================================================

async function googleSignupCallback(req, res) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?googleError=${encodeURIComponent(
          "Google signup was cancelled",
        )}`,
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?googleError=${encodeURIComponent(
          "Invalid Google OAuth response",
        )}`,
      );
    }

    // ----------------------------------------------
    // Verify state
    // ----------------------------------------------

    let decodedState;

    try {
      decodedState = jwt.verify(state, process.env.JWT_SECRET);
    } catch (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?googleError=${encodeURIComponent(
          "Invalid or expired Google OAuth state",
        )}`,
      );
    }

    if (decodedState.purpose !== "google-signup") {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?googleError=${encodeURIComponent(
          "Invalid Google signup request",
        )}`,
      );
    }

    // ----------------------------------------------
    // Exchange authorization code
    // ----------------------------------------------

    const { tokens } = await googleClient.getToken(code);

    googleClient.setCredentials(tokens);

    if (!tokens.access_token) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?googleError=${encodeURIComponent(
          "Google authentication failed",
        )}`,
      );
    }

    // ----------------------------------------------
    // Get Google profile
    // ----------------------------------------------

    const googleResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );

    if (!googleResponse.ok) {
      throw new Error("Unable to fetch Google user information");
    }

    const googleUser = await googleResponse.json();

    const { id: googleId, email, verified_email, name } = googleUser;

    // ----------------------------------------------
    // Make sure Google email is verified
    // ----------------------------------------------

    if (!email || !verified_email) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/register?googleError=${encodeURIComponent(
          "Google email could not be verified",
        )}`,
      );
    }

    // ----------------------------------------------
    // Check if account already exists
    // ----------------------------------------------

    const existingUser = await userModel.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?googleError=${encodeURIComponent(
          "An account with this email already exists. Please sign in with your email and password.",
        )}`,
      );
    }

    // ----------------------------------------------
    // Create temporary signup token
    // ----------------------------------------------

    const signupToken = jwt.sign(
      {
        purpose: "google-signup-complete",

        googleId,

        email: email.toLowerCase(),

        name: name || "",
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "10m",
      },
    );

    // ----------------------------------------------
    // Send user to username/password page
    // ----------------------------------------------

    return res.redirect(
      `${process.env.FRONTEND_URL}/google-signup?token=${encodeURIComponent(
        signupToken,
      )}`,
    );
  } catch (error) {
    console.log("Google OAuth Callback Error:", error);

    return res.redirect(
      `${process.env.FRONTEND_URL}/register?googleError=${encodeURIComponent(
        "Google signup failed. Please try again.",
      )}`,
    );
  }
}

// ======================================================
// COMPLETE GOOGLE SIGNUP
// ======================================================

async function completeGoogleSignup(req, res) {
  try {
    const { token, username, password } = req.body;

    if (!token || !username || !password) {
      return res.status(400).json({
        message: "Token, username and password are required",
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        message: "Username must be at least 3 characters",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // ----------------------------------------------
    // Verify temporary Google signup token
    // ----------------------------------------------

    let googleData;

    try {
      googleData = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        message:
          "Google verification expired. Please sign up with Google again.",
      });
    }

    if (googleData.purpose !== "google-signup-complete") {
      return res.status(401).json({
        message: "Invalid Google signup token",
      });
    }

    // ----------------------------------------------
    // Check username
    // ----------------------------------------------

    const existingUsername = await userModel.findOne({
      username,
    });

    if (existingUsername) {
      return res.status(409).json({
        message: "Username already taken",
      });
    }

    // ----------------------------------------------
    // Check email again
    // ----------------------------------------------

    const existingEmail = await userModel.findOne({
      email: googleData.email,
    });

    if (existingEmail) {
      return res.status(409).json({
        message: "Account with this email already exists",
      });
    }

    // ----------------------------------------------
    // Hash password
    // ----------------------------------------------

    const hashedPassword = await bcrypt.hash(password, 10);

    // ----------------------------------------------
    // Create account
    // ----------------------------------------------

    const user = await userModel.create({
      username,

      email: googleData.email,

      password: hashedPassword,

      googleId: googleData.googleId,

      authProvider: "google",
    });

    return res.status(201).json({
      message: "Google verified account created successfully",

      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Complete Google Signup Error:", error);

    return res.status(500).json({
      message: "Unable to complete Google signup",
    });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,

  googleSignup,
  googleSignupCallback,
  completeGoogleSignup,
};
