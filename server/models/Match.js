// ──────────────────────────────────────────────────────────────
//  Match model — links ONE Candidate to ONE Job with the score the
//  Python service computed. This is the "match-many" half of
//  parse-once/match-many: one Candidate can have many Match rows
//  (one per job they were scored against).
//
//  This row is also where the "lie-detector" view will live later:
//  it will grow testId + testScore fields, so match % (paper claim)
//  and test score (proven skill) sit side by side.
// ──────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    // ── Scoring result from Python /match-text ──
    matchScore: { type: Number, min: 0, max: 100, default: 0 },
    matched: { type: [String], default: [] }, // required skills found
    missing: { type: [String], default: [] }, // required skills not found
  },
  { timestamps: true }
);

// One score per (candidate, job) pair — re-matching UPDATES the existing row
// instead of piling up duplicates. The unique index enforces it at the DB
// level even if route code forgets.
matchSchema.index({ candidate: 1, job: 1 }, { unique: true });

module.exports = mongoose.model("Match", matchSchema);
