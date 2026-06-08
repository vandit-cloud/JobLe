// ──────────────────────────────────────────────────────────────
//  Job routes — recruiter CRUD for job openings, plus a /match route
//  that scores an uploaded resume against a job's required skills by
//  forwarding to the Python service. All owner-scoped + auth-protected.
// ──────────────────────────────────────────────────────────────
const express = require("express");
const multer = require("multer");
const Job = require("../models/Job");
const Candidate = require("../models/Candidate");
const Match = require("../models/Match");
const auth = require("../middleware/auth");
// Shared Python-service client (matchFileToSkills used to live here).
const { matchFileToSkills, matchText } = require("../resumeClient");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ── CREATE a job ───────────────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const job = await Job.create({
      title: req.body.title,
      requiredSkills: req.body.requiredSkills,
      description: req.body.description,
      isPublic: req.body.isPublic === true, // anything but true = private
      owner: req.user.id, // from the token, never the client
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── LIST my jobs ───────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const jobs = await Job.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET one job (owner-scoped) ─────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, owner: req.user.id });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── UPDATE a job ───────────────────────────────────────────────
router.put("/:id", auth, async (req, res) => {
  try {
    // Mongoose drops keys whose value is undefined, so a PUT that sends ONLY
    // { isPublic } (the publish toggle) leaves title/skills untouched.
    const updated = await Job.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      {
        title: req.body.title,
        requiredSkills: req.body.requiredSkills,
        description: req.body.description,
        isPublic: req.body.isPublic,
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Job not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── DELETE a job ───────────────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!job) return res.status(404).json({ error: "Job not found" });
    // Cascade: match rows for a deleted job point at nothing — remove them
    // (same pattern as Test → Result).
    await Match.deleteMany({ job: job._id });
    res.json({ message: "Job deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── MATCH one resume against this job ──────────────────────────
// POST /api/jobs/:id/match  (multipart, field "resume")
router.post("/:id/match", auth, upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No resume file uploaded." });
  }
  try {
    const job = await Job.findOne({ _id: req.params.id, owner: req.user.id });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(await matchFileToSkills(req.file, job.requiredSkills));
  } catch (error) {
    res.status(502).json({
      error: "Could not reach the resume service. Is it running on port 8000?",
    });
  }
});

// ── BULK MATCH many resumes against this job ───────────────────
// POST /api/jobs/:id/match-bulk  (multipart, field "resumes" = many files)
// Scores every file, then returns them RANKED best-match-first. A single file
// that fails to parse becomes an entry with an `error` and sinks to the bottom
// instead of failing the whole batch.
router.post(
  "/:id/match-bulk",
  auth,
  upload.array("resumes", 50),
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No resume files uploaded." });
    }
    try {
      const job = await Job.findOne({ _id: req.params.id, owner: req.user.id });
      if (!job) return res.status(404).json({ error: "Job not found" });

      // Score all files concurrently. One failure shouldn't sink the batch.
      const results = await Promise.all(
        req.files.map(async (file) => {
          try {
            const r = await matchFileToSkills(file, job.requiredSkills);
            return { filename: file.originalname, ...r };
          } catch (e) {
            return { filename: file.originalname, error: "Could not parse" };
          }
        })
      );

      // Rank best-first; errored entries (no matchScore) sink to the bottom.
      results.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));

      res.json({ jobTitle: job.title, results });
    } catch (error) {
      res.status(502).json({
        error:
          "Could not reach the resume service. Is it running on port 8000?",
      });
    }
  }
);

// ── MATCH all STORED candidates against this job ───────────────
// POST /api/jobs/:id/match-stored
// The persistent version of bulk match: no files — every stored Candidate's
// resumeText is scored via Python /match-text (parse-once / match-many), and
// each result is UPSERTED into Match (the unique candidate+job index means
// re-running refreshes scores instead of duplicating rows).
router.post("/:id/match-stored", auth, async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, owner: req.user.id });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const candidates = await Candidate.find({ owner: req.user.id });
    if (candidates.length === 0) {
      return res.status(400).json({ error: "No stored candidates to match. Upload some first." });
    }

    await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const r = await matchText(candidate.resumeText, job.requiredSkills);
          await Match.findOneAndUpdate(
            { candidate: candidate._id, job: job._id },
            {
              owner: req.user.id,
              matchScore: r.matchScore ?? 0,
              matched: r.matchedSkills ?? [],
              missing: r.missingSkills ?? [],
            },
            { upsert: true, setDefaultsOnInsert: true }
          );
        } catch (e) {
          // One bad candidate shouldn't fail the whole run.
        }
      })
    );

    // Hand back the fresh ranked list (same shape as GET /:id/matches).
    const matches = await Match.find({ job: job._id, owner: req.user.id })
      .populate("candidate", "name email skills sourceFilename")
      .sort({ matchScore: -1 });
    res.json({ jobTitle: job.title, matches });
  } catch (error) {
    res.status(502).json({
      error: "Could not reach the resume service. Is it running on port 8000?",
    });
  }
});

// ── GET the saved ranked shortlist for this job ────────────────
// GET /api/jobs/:id/matches — reads straight from Mongo, so the shortlist
// SURVIVES reloads (the whole point of this slice). No Python call here.
router.get("/:id/matches", auth, async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, owner: req.user.id });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const matches = await Match.find({ job: job._id, owner: req.user.id })
      .populate("candidate", "name email skills sourceFilename")
      .sort({ matchScore: -1 });
    res.json({ jobTitle: job.title, matches });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
