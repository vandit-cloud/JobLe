// ──────────────────────────────────────────────────────────────
//  Public job board routes — NO auth middleware on purpose: these are
//  the candidate-facing endpoints (same trust model as GET /api/tests/:id,
//  the public take-a-test link).
//
//  The apply flow is just a SECOND ENTRANCE to the existing pipeline:
//  a self-application creates a Candidate owned by the JOB'S recruiter
//  (parse-once) and auto-upserts a Match against that job (match-many).
//  The recruiter's Candidates page and Shortlist show it like any
//  recruiter-uploaded resume — only `source` says how it arrived.
// ──────────────────────────────────────────────────────────────
const express = require("express");
const multer = require("multer");
const Job = require("../models/Job");
const Candidate = require("../models/Candidate");
const Match = require("../models/Match");
const { parseFile, matchText } = require("../resumeClient");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// What the public is allowed to see about a job. NOTE: owner is populated
// with companyName ONLY — the recruiter's email must not leak to strangers.
const PUBLIC_JOB_FIELDS = "title requiredSkills description createdAt";

// ── LIST all public jobs (the board) ───────────────────────────
// GET /api/board
router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find({ isPublic: true })
      .select(PUBLIC_JOB_FIELDS)
      .populate("owner", "companyName") // company shown, email NOT included
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET one public job (the apply page) ────────────────────────
// GET /api/board/:jobId — note the isPublic check in the QUERY: a private
// job behaves exactly like a nonexistent one (404), so candidates can't
// probe for hidden jobs by guessing ids.
router.get("/:jobId", async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.jobId, isPublic: true })
      .select(PUBLIC_JOB_FIELDS)
      .populate("owner", "companyName");
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (error) {
    res.status(404).json({ error: "Job not found" });
  }
});

// ── APPLY to a public job ──────────────────────────────────────
// POST /api/board/:jobId/apply  (multipart, field "resume" = one file)
// Parse once → save Candidate owned by the job's recruiter → auto-match
// against this job. Same upsert-by-email rule as recruiter bulk upload,
// so re-applying with a fresher resume updates instead of duplicating.
router.post("/:jobId/apply", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please attach your resume." });
  }
  try {
    const job = await Job.findOne({ _id: req.params.jobId, isPublic: true });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const parsed = await parseFile(req.file);
    const fields = {
      owner: job.owner, // the candidate lands in the RECRUITER's pool
      name: parsed.name || "",
      email: parsed.email || "",
      phone: parsed.phone || "",
      location: parsed.location || "",
      skills: parsed.skills || [],
      summary: parsed.summary || "",
      experience: parsed.experience || [],
      education: parsed.education || [],
      parsedBy: parsed.source || "", // /parse calls the tier "source"
      resumeText: parsed.resumeText || "",
      sourceFilename: req.file.originalname,
      source: "self-applied", // vs the default "recruiter-upload"
    };

    let candidate;
    if (fields.email) {
      candidate = await Candidate.findOneAndUpdate(
        { owner: job.owner, email: fields.email.toLowerCase() },
        fields,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      candidate = await Candidate.create(fields);
    }

    // Auto-match against the job they applied to (best effort: if scoring
    // fails the application is still saved — the recruiter can re-match).
    let matchScore = null;
    try {
      const r = await matchText(candidate.resumeText, job.requiredSkills);
      await Match.findOneAndUpdate(
        { candidate: candidate._id, job: job._id },
        {
          owner: job.owner,
          matchScore: r.matchScore ?? 0,
          matched: r.matchedSkills ?? [],
          missing: r.missingSkills ?? [],
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
      matchScore = r.matchScore ?? 0;
    } catch (e) {
      // swallow — saving the application matters more than the score
    }

    // Deliberately SLIM response: applicants get a confirmation, not their
    // parsed profile or score — that analysis belongs to the recruiter.
    res.status(201).json({
      message: "Application received!",
      jobTitle: job.title,
      matchScore, // small transparency nod; remove if recruiters object
    });
  } catch (error) {
    res.status(502).json({
      error: "We couldn't process your resume right now. Please try again.",
    });
  }
});

module.exports = router;
