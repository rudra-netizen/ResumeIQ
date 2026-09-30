const mongoose = require("mongoose");

async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("Connected to Database");
  } catch (err) {
    console.error("Database Connection Error:", err.message);
    throw err;
  }
}

module.exports = connectToDB;
