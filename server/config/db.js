// ──────────────────────────────────────────────────────────────
//  Database connection
//  This file's only job: connect our backend to MongoDB — and, just
//  as importantly, KEEP THE SERVER ALIVE when the database isn't
//  reachable yet.
//
//  WHY THIS IS NOT A ONE-LINER: an earlier version called
//  `process.exit(1)` the instant Mongo couldn't be reached. Under
//  nodemon a clean exit is NOT auto-restarted — it just sits there
//  "waiting for file changes". So a momentary DB hiccup at startup
//  (no internet, or a new WiFi whose IP isn't in the Atlas allowlist)
//  left the whole backend dead until someone edited a file. That
//  killed a live demo once. We never want that again.
//
//  Instead: retry forever with a capped backoff. The web server keeps
//  listening the entire time (see index.js — `listen` is not gated on
//  this), so the app recovers ON ITS OWN the moment the database
//  becomes reachable again.
// ──────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

// How long to wait for the DB to respond before calling ONE attempt a
// failure. Mongoose defaults to 30s — far too long to wait to find out
// something's wrong. 5s means fast feedback, then we retry.
const SERVER_SELECTION_TIMEOUT_MS = 5000;

async function connectWithRetry(attempt = 1) {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    // Backoff: 2s, 4s, 6s… capped at 15s, so we keep trying often enough
    // to recover quickly without spamming the logs forever.
    const delayMs = Math.min(2000 * attempt, 15000);
    console.error(
      `❌ MongoDB connection failed (attempt ${attempt}): ${error.message}`
    );
    console.error(
      `   ↻ Retrying in ${delayMs / 1000}s. The server stays up; it will ` +
        `connect automatically once the database is reachable.`
    );
    setTimeout(() => connectWithRetry(attempt + 1), delayMs);
  }
}

function connectDB() {
  // After the FIRST successful connect, mongoose handles reconnects on its
  // own — these listeners just make that visible in the logs.
  mongoose.connection.on("disconnected", () =>
    console.warn("⚠️  MongoDB disconnected — mongoose will try to reconnect.")
  );
  mongoose.connection.on("reconnected", () =>
    console.log("✅ MongoDB reconnected.")
  );

  // Fire-and-forget: index.js does NOT await this, so the HTTP server can
  // start listening immediately and serve /api/health (and clear 503s on
  // DB routes) while we keep trying to connect.
  connectWithRetry();
}

module.exports = connectDB;
