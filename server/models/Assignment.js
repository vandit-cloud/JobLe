// ──────────────────────────────────────────────────────────────
//  Assignment model — "this Test is FOR that Candidate."
//  This is the missing link between the exam spine (Phase 1) and the
//  talent pool (Phase 3). Created when a recruiter saves a test that
//  was generated from a candidate's resume. The candidate finds it on
//  their "My tests" page (linked by email); completing it stamps the
//  score HERE — which, next to Match.matchScore, is the lie-detector:
//  resume claim vs proven skill.
// ──────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },

    // Filled in when the candidate submits. null until then.
    score: { type: Number, default: null },
    total: { type: Number, default: null },
  },
  { timestamps: true }
);

// One assignment per (test, candidate) pair — re-saving a generated test for
// the same candidate refreshes the row instead of inviting them twice.
// (Same DB-level guarantee pattern as Match's candidate+job index.)
assignmentSchema.index({ test: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model("Assignment", assignmentSchema);
