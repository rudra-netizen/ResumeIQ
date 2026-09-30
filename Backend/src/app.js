const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",

    credentials: true,
  }),
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(cookieParser());

const authRouter = require("./routes/auth.routes");

const interviewRouter = require("./routes/interview.routes");

app.use("/api/auth", authRouter);

app.use("/api/interview", interviewRouter);

app.use((err, req, res, next) => {
  console.error(err);

  return res.status(err.statusCode || 500).json({
    message: err.message || "Something went wrong.",
  });
});

module.exports = app;
