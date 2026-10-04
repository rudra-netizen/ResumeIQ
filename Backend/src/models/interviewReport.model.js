const mongoose = require("mongoose");

// ======================================================
// TECHNICAL QUESTION SCHEMA
// ======================================================

const technicalQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Technical question is required"],
    },

    intention: {
      type: String,
      required: [true, "Intention is required"],
    },

    answer: {
      type: String,
      required: [true, "Answer is required"],
    },
  },
  {
    _id: false,
  },
);

// ======================================================
// BEHAVIORAL QUESTION SCHEMA
// ======================================================

const behavioralQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Behavioral question is required"],
    },

    intention: {
      type: String,
      required: [true, "Intention is required"],
    },

    answer: {
      type: String,
      required: [true, "Answer is required"],
    },
  },
  {
    _id: false,
  },
);

// ======================================================
// SKILL GAP SCHEMA
// ======================================================

const skillGapSchema = new mongoose.Schema(
  {
    skill: {
      type: String,
      required: [true, "Skill is required"],
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: [true, "Severity is required"],
    },
  },
  {
    _id: false,
  },
);

// ======================================================
// PREPARATION PLAN SCHEMA
// ======================================================

const preparationPlanSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: [true, "Day is required"],
  },

  focus: {
    type: String,
    required: [true, "Focus is required"],
  },

  tasks: [
    {
      type: String,
      required: [true, "Task is required"],
    },
  ],
});

// ======================================================
// INTERVIEW REPORT SCHEMA
// ======================================================

const interviewReportSchema = new mongoose.Schema(
  {
    jobDescription: {
      type: String,
      required: [true, "Job description is required"],
    },

    resume: {
      type: String,
    },

    selfDescription: {
      type: String,
    },

    matchScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    technicalQuestions: [technicalQuestionSchema],

    behavioralQuestions: [behavioralQuestionSchema],

    skillGaps: [skillGapSchema],

    preparationPlan: [preparationPlanSchema],

    // IMPORTANT:
    // Every report MUST belong to a user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Report owner is required"],
      index: true,
    },

    title: {
      type: String,
      required: [true, "Job title is required"],
    },
  },
  {
    timestamps: true,
  },
);

const interviewReportModel = mongoose.model(
  "InterviewReport",
  interviewReportSchema,
);

module.exports = interviewReportModel;
