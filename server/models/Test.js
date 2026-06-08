// ──────────────────────────────────────────────────────────────
//  Test model — the blueprint for a skills test in the database.
//  We EMBED questions directly inside each test (Option A), because
//  a test's questions are always read together with the test.
// ──────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

// A "schema" defines the shape + rules of the data.
// First, the shape of ONE question (used inside the test below).
const questionSchema = new mongoose.Schema({
  // The question text, e.g. "What does HTML stand for?"
  text: {
    type: String,
    required: true, // a question with no text makes no sense
    trim: true,     // strip accidental leading/trailing spaces
  },

  // The multiple-choice options, e.g. ["A", "B", "C", "D"].
  // [String] means "an array of strings".
  options: {
    type: [String],
    required: true,
  },

  // Which option is correct, stored as its position in the array.
  // e.g. correctIndex: 2 means options[2] is the right answer.
  // We store the INDEX (a number) rather than the answer text — see insight.
  correctIndex: {
    type: Number,
    required: true,
  },
});

// Now the shape of a whole Test.
const testSchema = new mongoose.Schema(
  {
    // Which recruiter owns this test. Set from the logged-in user when
    // created; used to show each recruiter ONLY their own tests.
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
    // The minimum % a candidate must score to PASS. Stored as a percentage
    // (0–100) so it's independent of how many questions the test has.
    passPercent: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    // How long the candidate has, in minutes. 0 means "no time limit"
    // (the test stays open until they submit). Stored in minutes because
    // that's how a recruiter thinks; the browser converts to seconds to tick.
    timeLimitMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: "", // optional — defaults to empty if not provided
    },
    // An array of the question shape we defined above. This is the EMBED.
    questions: [questionSchema],
  },
  {
    // timestamps: true auto-adds `createdAt` and `updatedAt` fields.
    timestamps: true,
  }
);

// A "model" turns the schema into something we can actually use to
// create/find/save tests. Mongoose will store these in a "tests" collection.
module.exports = mongoose.model("Test", testSchema);
