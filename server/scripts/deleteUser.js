// ──────────────────────────────────────────────────────────────
//  Admin script: delete a user account (by email), safely.
//
//  WHY THIS EXISTS: the app has no "delete account" button yet, and
//  deleting a recruiter straight from Atlas/mongosh ORPHANS all the
//  data they own (tests, jobs, candidates, matches, assignments,
//  applications, results) — invisible rows pointing at an account
//  that no longer exists. This script cleans those up too.
//
//  SAFE BY DEFAULT: with no flag it's a DRY RUN — it only PRINTS what
//  it would delete. Nothing is removed until you re-run with --confirm.
//
//  Usage (from the server/ folder):
//    node scripts/deleteUser.js someone@example.com           ← dry run
//    node scripts/deleteUser.js someone@example.com --confirm ← actually delete
// ──────────────────────────────────────────────────────────────
const path = require("path");
// Load server/.env no matter which folder we're run from.
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const User = require("../models/User");
const Test = require("../models/Test");
const Job = require("../models/Job");
const Candidate = require("../models/Candidate");
const Match = require("../models/Match");
const Assignment = require("../models/Assignment");
const Application = require("../models/Application");
const Result = require("../models/Result");

async function main() {
  // ── 1. Read & validate the command-line arguments ───────────────
  const email = (process.argv[2] || "").toLowerCase().trim();
  const confirm = process.argv.includes("--confirm");

  if (!email || email.startsWith("--")) {
    console.error("Usage: node scripts/deleteUser.js <email> [--confirm]");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
  });

  // ── 2. Find the account ─────────────────────────────────────────
  const user = await User.findOne({ email });
  if (!user) {
    console.log(`No user found with email "${email}". Nothing to do.`);
    return;
  }
  console.log(
    `Found ${user.role} account: ${user.email} (id ${user._id})` +
      (user.companyName ? ` — ${user.companyName}` : "")
  );

  // ── 3. Work out what gets deleted ───────────────────────────────
  // A candidate login owns NO recruiter-side data — deleting it is just
  // removing the login. (Their resume rows live in recruiters' pools,
  // linked only by email, and are intentionally left alone.)
  if (user.role === "candidate") {
    console.log(
      "\nThis is a candidate login. Only the login is removed; any resume\n" +
        "rows recruiters hold for this email are linked by email, not id,\n" +
        "and are left untouched."
    );
    if (!confirm) {
      console.log("\nDRY RUN — nothing deleted. Re-run with --confirm.");
      return;
    }
    await User.deleteOne({ _id: user._id });
    console.log("\n✅ Deleted the candidate login.");
    return;
  }

  // A recruiter owns data across 6 collections (+ results, via their tests).
  // Count it all first so we can show a summary before touching anything.
  const owner = user._id;
  const myTestIds = (await Test.find({ owner }).select("_id")).map((t) => t._id);

  const counts = {
    tests: myTestIds.length,
    jobs: await Job.countDocuments({ owner }),
    candidates: await Candidate.countDocuments({ owner }),
    matches: await Match.countDocuments({ owner }),
    assignments: await Assignment.countDocuments({ owner }),
    applications: await Application.countDocuments({ owner }),
    results: await Result.countDocuments({ testId: { $in: myTestIds } }),
  };

  console.log("\nThis recruiter owns:");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(13)} ${v}`);

  if (!confirm) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --confirm to delete");
    console.log("the account AND all of the above.");
    return;
  }

  // ── 4. Cascade-delete, then the account itself ──────────────────
  // Results first (they hang off the tests we're about to remove).
  await Result.deleteMany({ testId: { $in: myTestIds } });
  await Test.deleteMany({ owner });
  await Job.deleteMany({ owner });
  await Candidate.deleteMany({ owner });
  await Match.deleteMany({ owner });
  await Assignment.deleteMany({ owner });
  await Application.deleteMany({ owner });
  await User.deleteOne({ _id: owner });

  console.log("\n✅ Deleted the recruiter account and all owned data above.");
}

// Always disconnect, even if something throws, so the script exits cleanly.
main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
