const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const tokenBlacklistModel = require("../models/blacklist.model");

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,

    secure: false,

    sameSite: "lax",

    maxAge: 24 * 60 * 60 * 1000,
  });
}

async function registerUserController(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required.",
      });
    }

    const existingUser = await userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,

      email,

      password: hashedPassword,
    });

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "1d",
      },
    );

    setAuthCookie(res, token);

    return res.status(201).json({
      message: "Registration successful.",

      user: {
        id: user._id,

        username: user.username,

        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    return res.status(500).json({
      message: "Registration failed.",
    });
  }
}

async function loginUserController(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await userModel.findOne({
      email,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "1d",
      },
    );

    setAuthCookie(res, token);

    return res.status(200).json({
      message: "Login successful.",

      user: {
        id: user._id,

        username: user.username,

        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      message: "Login failed.",
    });
  }
}

async function logoutUserController(req, res) {
  try {
    const token = req.cookies?.token;

    if (token) {
      await tokenBlacklistModel.create({
        token,
      });
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.status(200).json({
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      message: "Logout failed.",
    });
  }
}

async function getMeController(req, res) {
  try {
    const user = await userModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,

        username: user.username,

        email: user.email,
      },
    });
  } catch (error) {
    console.error("Get Me Error:", error);

    return res.status(500).json({
      message: "Failed to get user.",
    });
  }
}

module.exports = {
  registerUserController,

  loginUserController,

  logoutUserController,

  getMeController,
};
