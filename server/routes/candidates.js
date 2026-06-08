// ──────────────────────────────────────────────────────────────
//  Candidate routes — upload resumes ONCE, store the parsed profile.
//  This replaces the old "shortlist lives in the browser tab" flow:
//  POST /upload parses each file via Python /parse and SAVES a
//  Candidate document, so the talent pool survives reloads and can be
//  matched against any number of jobs later (parse-once / match-many).
// ──────────────────────────────────────────────────────────────
const express = require("express");
const multer = require("multer");
const Candidate = require("../models/Candidate");
const Match = require("../models/Match");
const Assignment = require("../models/Assignment");
const auth = require("../middleware/auth");
// Shared Python-service client — parseFile used to live in this file;
// extracted once the board routes needed it too.
const { RESUME_SERVICE_URL, parseFile } = require("../resumeClient");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ── UPLOAD candidates (bulk) ───────────────────────────────────
// POST /api/candidates/upload  (multipart, field "resumes" = many files)
// Each file is parsed once and saved. Re-uploading a resume whose parsed
// EMAIL matches an existing candidate UPDATES that candidate (fresher resume
// wins) instead of creating a duplicate. No email parsed = always a new row,
// because the filename alone isn't trustworthy identity.
router.post("/upload", auth, upload.array("resumes", 50), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No resume files uploaded." });
  }
  try {
    const saved = await Promise.all(
      req.files.map(async (file) => {
        try {
          const parsed = await parseFile(file);
          const fields = {
            owner: req.user.id,
            name: parsed.name || "",
            email: parsed.email || "",
            phone: parsed.phone || "",
            location: parsed.location || "",
            skills: parsed.skills || [],
            resumeText: parsed.resumeText || "",
            sourceFilename: file.originalname,
          };

          let candidate = null;
          if (fields.email) {
            // Same person re-uploaded? Update in place (upsert-by-email).
            candidate = await Candidate.findOneAndUpdate(
              { owner: req.user.id, email: fields.email.toLowerCase() },
              fields,
              { new: true, upsert: true, setDefaultsOnInsert: true }
            );
          } else {
            candidate = await Candidate.create(fields);
          }
          // Slim summary back to the browser (no resumeText — it's big).
          return {
            _id: candidate._id,
            name: candidate.name,
            email: candidate.email,
            skills: candidate.skills,
            sourceFilename: candidate.sourceFilename,
          };
        } catch (e) {
          return { sourceFilename: file.originalname, error: "Could not parse" };
        }
      })
    );
    res.status(201).json({ candidates: saved });
  } catch (error) {
    res.status(502).json({
      error: "Could not reach the resume service. Is it running on port 8000?",
    });
  }
});

// ── LIST my candidates ─────────────────────────────────────────
// resumeText is excluded — it's by far the biggest field and the list
// view never shows it. GET /:id returns it when actually needed.
router.get("/", auth, async (req, res) => {
  try {
    const candidates = await Candidate.find({ owner: req.user.id })
      .select("-resumeText")
      .sort({ createdAt: -1 });
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── ALL my candidates' job matches (for the talent-pool job tags) ──
// GET /api/candidates/matches — every Match this recruiter owns, each carrying
// its job's title and which candidate it belongs to. The Candidates page joins
// these by candidate id (same client-side join as the assignment badges) to tag
// each person with the job(s) they applied to / were matched against.
// IMPORTANT: declared BEFORE "/:id" — otherwise Express reads "matches" as an id.
router.get("/matches", auth, async (req, res) => {
  try {
    const matches = await Match.find({ owner: req.user.id })
      .populate("job", "title")
      .select("candidate job matchScore");
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET one candidate (full, including resumeText) ─────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    res.json(candidate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── GENERATE an AI test from a STORED candidate ────────────────
// POST /api/candidates/:id/generate-test — uses the stored resumeText, so it
// works long after the original file is gone. Returns the same draft shape
// as /api/resume/generate-test for the TestForm pre-fill flow.
router.post("/:id/generate-test", auth, async (req, res) => {
  try {
    const candidate = await Candidate.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    const response = await fetch(`${RESUME_SERVICE_URL}/generate-test-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: candidate.resumeText }),
    });
    if (!response.ok) {
      return res
        .status(502)
        .json({ error: "Resume service could not generate a test." });
    }
    res.json(await response.json());
  } catch (error) {
    res.status(502).json({
      error: "Could not reach the resume service. Is it running on port 8000?",
    });
  }
});

// ── DELETE a candidate (+ cascade their matches) ───────────────
// Same cascade pattern as Test → Result: a Match without its Candidate
// would be an orphaned row pointing at nothing.
router.delete("/:id", auth, async (req, res) => {
  try {
    const candidate = await Candidate.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    await Match.deleteMany({ candidate: candidate._id });
    // Also reap any test assignments for this candidate — without this they'd
    // dangle, pointing at a candidate that no longer exists. Same cascade
    // hygiene as the Match cleanup above.
    await Assignment.deleteMany({ candidate: candidate._id });
    res.json({ message: "Candidate deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
