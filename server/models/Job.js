// ──────────────────────────────────────────────────────────────
//  Job model — a role a recruiter is hiring for. Its `requiredSkills`
//  are what we score a candidate's resume against (the match %).
//  Owner-scoped, exactly like Test, so each recruiter sees only theirs.
// ──────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    // Which recruiter owns this job (set from the JWT, never trusted from the
    // client). Used to show each recruiter only their own jobs.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // The skills this role needs. Each one becomes a thing we look for in a
    // candidate's resume when scoring the match. Stored as plain strings.
    requiredSkills: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
    },

    // Publish to the PUBLIC job board? Default false = recruiter-internal
    // (the original Phase-2 "screening yardstick" behavior is unchanged).
    // Only public jobs are visible to candidates at /board and can receive
    // self-applications.
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
