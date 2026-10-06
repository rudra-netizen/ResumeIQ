const mongoose = require("mongoose");

const resumePilotMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("ResumePilotMessage", resumePilotMessageSchema);
