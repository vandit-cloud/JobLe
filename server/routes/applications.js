// ──────────────────────────────────────────────────────────────
//  Application routes — the candidate's view of "jobs I applied to".
//
//  HOW A CANDIDATE FINDS THEIR APPLICATIONS: identical bridge to
//  assignments/mine — the logged-in account is matched to recruiter-owned
//  Candidate rows by EMAIL (the email /parse pulled from the resume they
//  applied with). This is why applying logged-OUT still works: the link is
//  formed later, the moment they log in with that same email.
// ──────────────────────────────────────────────────────────────
const express = require("express");
const Application = require("../models/Application");
const Candidate = require("../models/Candidate");
const Match = require("../models/Match");
const authCandidate = require("../middleware/authCandidate"); // candidate bouncer

const router = express.Router();

// ── CANDIDATE: list the jobs I applied to ──────────────────────
// GET /api/applications/mine
router.get("/mine", authCandidate, async (req, res) => {
  try {
    // 1. Which recruiter-owned Candidate rows are "me"? (any recruiter's)
    const myCandidateRows = await Candidate.find({
      email: req.user.email.toLowerCase(),
    }).select("_id");
    const myIds = myCandidateRows.map((c) => c._id);

    // 2. My applications, newest first. Populate ONLY safe fields: the job
    //    title and the hiring company's name — never the recruiter's email.
    const applications = await Application.find({ candidate: { $in: myIds } })
      .populate("job", "title")
      .populate("owner", "companyName")
      .sort({ createdAt: -1 });

    // 3. Join the match score in memory. One query for all my Match rows,
    //    then a lookup keyed by "candidate_job" — avoids a DB hit per row.
    const matches = await Match.find({ candidate: { $in: myIds } }).select(
      "candidate job matchScore"
    );
    const scoreByPair = {};
    for (const m of matches) {
      scoreByPair[`${m.candidate}_${m.job}`] = m.matchScore;
    }

    // 4. Shape a slim, candidate-safe payload (no resume text, no internals).
    const result = applications.map((a) => ({
      _id: a._id,
      jobId: a.job?._id,
      jobTitle: a.job?.title || "Job",
      company: a.owner?.companyName || "Hiring company",
      status: a.status,
      appliedAt: a.createdAt,
      // null when no score was computed (the apply-time match is best-effort).
      matchScore: scoreByPair[`${a.candidate}_${a.job?._id}`] ?? null,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
