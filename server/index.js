// ──────────────────────────────────────────────────────────────
//  TalentLeague — Backend entry point
//  This file starts the web server that the frontend talks to.
// ──────────────────────────────────────────────────────────────

// 1. Load secrets (like the database password) from the .env file
//    into process.env so the rest of the app can read them.
require("dotenv").config();

// 2. Bring in the libraries we installed.
const express = require("express"); // the web server framework
const cors = require("cors");       // lets the frontend talk to us
const connectDB = require("./config/db"); // our database connection function

// 3. Create the Express application — this `app` object IS our server.
const app = express();

// Connect to MongoDB as soon as the app starts up.
connectDB();

// 4. "Middleware" = code that runs on EVERY incoming request,
//    before it reaches our routes. Think of it as a checkpoint line.
app.use(cors());          // allow the React frontend to call this API
app.use(express.json());  // automatically parse JSON request bodies

// 5. Our first ROUTE. A route = "when someone visits this URL, do this."
//    This is a health check: a simple way to confirm the server is alive.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "TalentLeague backend is running 🎉" });
});

// Auth routes (register / login) live under /api/auth.
app.use("/api/auth", require("./routes/auth"));

// All routes starting with /api/tests are handled by our tests router.
app.use("/api/tests", require("./routes/tests"));

// Job openings (recruiter CRUD) + resume-to-job match scoring.
app.use("/api/jobs", require("./routes/jobs"));

// Stored candidates — parse-once resume profiles + their job matches.
app.use("/api/candidates", require("./routes/candidates"));

// PUBLIC job board — candidate-facing, deliberately NOT auth-protected
// (same trust model as the public take-a-test link).
app.use("/api/board", require("./routes/board"));

// Test assignments — recruiter status list + the candidate "My tests" page.
app.use("/api/assignments", require("./routes/assignments"));

// 6. Start listening for requests on a PORT (a numbered door on your computer).
//    We read it from .env, or fall back to 5000 if it's not set.
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
