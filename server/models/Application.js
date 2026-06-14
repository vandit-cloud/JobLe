// ──────────────────────────────────────────────────────────────
//  Application model — a candidate's INTENT: "I applied to this job."
//
//  Why this exists as its own model (and isn't just a Match):
//  a Match {candidate, job} is RECRUITER analytics — the recruiter can
//  score any resume against any job internally, so a Match does NOT mean
//  the candidate ever applied. An Application is the candidate's own act,
//  created only when they apply via the public board. Keeping them
//  separate is what lets "My applications" list jobs the candidate truly
//  applied to, without leaking recruiter-internal matches.
//
//  Identity bridge: like Assignment, the link back to the login account
//  is the candidate's EMAIL (Application points at the recruiter-owned
//  Candidate row parsed from their resume). See routes/applications.js.
// ──────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    // The recruiter who owns the job (and the Candidate row). Copied from
    // the job on apply — same owner-scoping pattern as Match/Candidate.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The recruiter-owned Candidate row this application's resume became.
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    // The job they applied to — this is the link Match couldn't give us
    // unambiguously.
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    // Lifecycle of the application from the candidate's point of view.
    // For now everything starts (and stays) "applied"; richer states like
    // "under-review" can be set by the recruiter later without a migration.
    status: {
      type: String,
      enum: ["applied"],
      default: "applied",
    },
  },
  { timestamps: true }
);

// One application per (candidate, job): re-applying with a fresher resume
// UPDATES the existing row (touches updatedAt) instead of stacking dupes —
// mirrors the upsert-by-email rule the apply route already uses for the
// Candidate and Match rows.
applicationSchema.index({ candidate: 1, job: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
