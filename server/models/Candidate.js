// ──────────────────────────────────────────────────────────────
//  Candidate model — a person whose resume a recruiter uploaded.
//  This is the "parse-once" half of parse-once/match-many: the resume
//  file is parsed by the Python service ONE time and the result lives
//  here. Matching against jobs later reads THIS document — the file is
//  never parsed again. Keyed to the candidate, never glued to a job
//  (job links live in the separate Match model).
// ──────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    // Which recruiter uploaded this candidate (from the JWT, never the
    // client) — same owner-scoping pattern as Test and Job.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Parsed profile (whatever /parse could extract; all optional) ──
    name: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    skills: { type: [String], default: [] },

    // The full plain text extracted from the resume file. Stored so we can
    // re-match against NEW jobs (and generate AI tests) months later without
    // needing the original file again.
    resumeText: { type: String, default: "" },

    // The uploaded file's name — the recruiter's handle on "which resume
    // was this" (especially when parsing found no name).
    sourceFilename: { type: String, default: "" },

    // How this candidate entered the pool: uploaded by the recruiter, or
    // self-applied via the public job board. Same pipeline either way —
    // this tag is the ONLY difference.
    source: {
      type: String,
      enum: ["recruiter-upload", "self-applied"],
      default: "recruiter-upload",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Candidate", candidateSchema);
