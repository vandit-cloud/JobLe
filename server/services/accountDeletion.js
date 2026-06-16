// ──────────────────────────────────────────────────────────────
//  accountDeletion — the ONE place that knows how to remove a user
//  and everything they own. Shared by:
//    • routes/auth.js   → DELETE /api/auth/me (a user deletes themselves)
//    • scripts/deleteUser.js → admin CLI (the lead deletes anyone)
//  Keeping it in one module means the cascade can never drift between
//  the button and the script (same idea as the shared TestForm on the
//  frontend).
// ──────────────────────────────────────────────────────────────
const User = require("../models/User");
const Test = require("../models/Test");
const Job = require("../models/Job");
const Candidate = require("../models/Candidate");
const Match = require("../models/Match");
const Assignment = require("../models/Assignment");
const Application = require("../models/Application");
const Result = require("../models/Result");

// Count everything a RECRUITER owns WITHOUT deleting it (for previews/dry-runs).
// Their data lives across these collections, all pointing back via `owner`;
// results hang off their tests via testId (Result has no owner of its own).
async function summarizeOwnedData(ownerId) {
  const testIds = (await Test.find({ owner: ownerId }).select("_id")).map(
    (t) => t._id
  );
  return {
    testIds,
    counts: {
      tests: testIds.length,
      jobs: await Job.countDocuments({ owner: ownerId }),
      candidates: await Candidate.countDocuments({ owner: ownerId }),
      matches: await Match.countDocuments({ owner: ownerId }),
      assignments: await Assignment.countDocuments({ owner: ownerId }),
      applications: await Application.countDocuments({ owner: ownerId }),
      results: await Result.countDocuments({ testId: { $in: testIds } }),
    },
  };
}

// Delete the account and (for recruiters) all owned data. Returns a summary of
// what was removed. A CANDIDATE login owns no recruiter-side data, so we just
// remove the login — the resume rows recruiters hold for that email are linked
// by email (not id) and are intentionally left in their pools.
async function deleteAccount(user) {
  if (user.role === "candidate") {
    await User.deleteOne({ _id: user._id });
    return { role: "candidate", counts: {} };
  }

  const { testIds, counts } = await summarizeOwnedData(user._id);
  // Results first — they reference the tests we're about to remove.
  await Result.deleteMany({ testId: { $in: testIds } });
  await Test.deleteMany({ owner: user._id });
  await Job.deleteMany({ owner: user._id });
  await Candidate.deleteMany({ owner: user._id });
  await Match.deleteMany({ owner: user._id });
  await Assignment.deleteMany({ owner: user._id });
  await Application.deleteMany({ owner: user._id });
  await User.deleteOne({ _id: user._id });
  return { role: "recruiter", counts };
}

module.exports = { summarizeOwnedData, deleteAccount };
