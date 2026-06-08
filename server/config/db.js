// ──────────────────────────────────────────────────────────────
//  Database connection
//  This file's only job: connect our backend to MongoDB.
// ──────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

// We export an async function so index.js can `await` the connection
// before the server starts accepting requests.
async function connectDB() {
  try {
    // mongoose.connect reads the secret connection string from .env.
    // It returns once the connection is established.
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    // If we can't reach the database, the app is useless — so we log
    // the error and shut down rather than run in a broken state.
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1); // exit code 1 = "stopped because of an error"
  }
}

module.exports = connectDB;
