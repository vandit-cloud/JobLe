// ──────────────────────────────────────────────────────────────
//  Resume routes — the GATEWAY to the Python resume service.
//  The browser uploads a resume here; Node (which holds auth) forwards
//  the file to the separate Python/FastAPI parser over HTTP and relays
//  the structured result back. Node never parses anything itself, and
//  Python never sees our database or our auth — that's the boundary.
// ──────────────────────────────────────────────────────────────
const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth"); // recruiters only

const router = express.Router();

// Keep the upload in MEMORY — we only forward it, we never save it to disk.
// 5 MB cap so nobody can upload a huge file and tie up the server.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Where the Python service lives. Configurable via .env so it can change in
// production without touching code; defaults to local dev.
const RESUME_SERVICE_URL =
  process.env.RESUME_SERVICE_URL || "http://localhost:8000";

// Shared helper: take the uploaded file off req, forward it to a path on the
// Python service, and relay the JSON back. Both routes below differ only in
// WHICH Python path they hit, so the forwarding logic lives here once.
async function forwardToPython(req, res, pythonPath) {
  if (!req.file) {
    return res.status(400).json({ error: "No resume file uploaded." });
  }

  try {
    // Rebuild the uploaded bytes as multipart form-data to forward to Python.
    // Node 18+ gives us FormData/Blob globally — no extra library needed.
    const form = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    form.append("resume", blob, req.file.originalname);

    const response = await fetch(`${RESUME_SERVICE_URL}${pythonPath}`, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      return res
        .status(502)
        .json({ error: "Resume service could not process that file." });
    }

    // Relay the Python service's JSON straight back to the browser.
    res.json(await response.json());
  } catch (error) {
    // The usual cause here is the Python service simply not being up.
    res.status(502).json({
      error: "Could not reach the resume service. Is it running on port 8000?",
    });
  }
}

// ── POST /api/resume/analyze ───────────────────────────────────
// Parse a resume into structured fields. Field name "resume" must match what
// the frontend sends.
router.post("/analyze", auth, upload.single("resume"), (req, res) =>
  forwardToPython(req, res, "/parse")
);

// ── POST /api/resume/generate-test ─────────────────────────────
// Draft an MCQ test FROM a resume (bank fallback now, Groq later). Returns
// { questions, source, skillsCovered } for the recruiter to review + save.
router.post("/generate-test", auth, upload.single("resume"), (req, res) =>
  forwardToPython(req, res, "/generate-test")
);

module.exports = router;
