// ──────────────────────────────────────────────────────────────
//  Assignment routes — both sides of "this test is FOR that candidate".
//  Recruiter side lists assignments to show status on the Candidates
//  page; candidate side powers the "My tests" page.
//
//  HOW A CANDIDATE FINDS THEIR ASSIGNMENTS: Candidate docs are
//  recruiter-owned rows parsed from resumes — they are NOT the login
//  account. The bridge is EMAIL: the logged-in user's email matched
//  against Candidate.email (which /parse extracted from their resume).
//  Same identity key as the upsert-by-email dedup.
// ──────────────────────────────────────────────────────────────
const express = require("express");
const Assignment = require("../models/Assignment");
const Candidate = require("../models/Candidate");
const auth = require("../middleware/auth"); // recruiter bouncer
const authCandidate = require("../middleware/authCandidate"); // candidate bouncer

const router = express.Router();

// ── RECRUITER: list my assignments ─────────────────────────────
// GET /api/assignments — used by the Candidates page to show, per
// candidate, whether a test was sent and how they scored.
router.get("/", auth, async (req, res) => {
  try {
    const assignments = await Assignment.find({ owner: req.user.id })
      .populate("test", "title")
      .populate("candidate", "name email")
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── CANDIDATE: list the tests waiting for ME ───────────────────
// GET /api/assignments/mine — the "My tests" page. Finds every Candidate
// row (any recruiter's) whose parsed email matches the logged-in account,
// then the assignments pointing at those rows.
router.get("/mine", authCandidate, async (req, res) => {
  try {
    const myCandidateRows = await Candidate.find({
      email: req.user.email.toLowerCase(),
    }).select("_id");

    const assignments = await Assignment.find({
      candidate: { $in: myCandidateRows.map((c) => c._id) },
    })
      .populate("test", "title timeLimitMinutes") // safe fields only — no questions/answers
      .populate("owner", "companyName") // which company is inviting them
      .sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── PUBLIC: one assignment's status ────────────────────────────
// GET /api/assignments/:id/status — used by the take-test page ON LOAD so a
// completed test shows "already done" instead of letting the candidate
// re-answer everything and only failing at submit. Deliberately public:
// whoever holds the assignment id could reach the submit route anyway —
// same trust model as the test link itself — and it returns ONLY the
// status + score, never questions or identity.
router.get("/:id/status", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).select(
      "status score total"
    );
    if (!assignment) {
      return res.status(404).json({ error: "Invitation not found." });
    }
    res.json({
      status: assignment.status,
      score: assignment.score,
      total: assignment.total,
    });
  } catch (error) {
    res.status(404).json({ error: "Invitation not found." });
  }
});

module.exports = router;
