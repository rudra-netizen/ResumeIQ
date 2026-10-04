const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: [true, "username already taken"],
      required: true,
      trim: true,
    },

    email: {
      type: String,
      unique: [true, "Account already exists"],
      required: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    googleId: {
      type: String,
      default: null,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("users", userSchema);
