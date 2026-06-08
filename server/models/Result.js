// ──────────────────────────────────────────────────────────────
//  Result model — one candidate's completed attempt at a test.
//  Every time a candidate submits, we save ONE of these so the
//  recruiter can later see who took the test and how they scored.
// ──────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    // Which test this result belongs to. We store the Test's _id and tell
    // Mongoose it "refers to" a Test document. (ObjectId + ref is the
    // standard way to LINK two collections — I've written this one for you.)
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    // The candidate's name, so the recruiter knows whose score this is.
    candidateName: { type: String, required: true, trim: true },

    // How many they got right, and out of how many.
    score: { type: Number, required: true },
    total: { type: Number, required: true },

    // The candidate's chosen option index for each question, e.g. [1, 0, 2].
    // Lets the recruiter later see WHICH questions were missed, not just the
    // score. Defaults to empty for safety.
    answers: { type: [Number], default: [] },
  },
  {
    // Auto-adds createdAt — handy: "when did they take it?" for free.
    timestamps: true,
  }
);

module.exports = mongoose.model("Result", resultSchema);
