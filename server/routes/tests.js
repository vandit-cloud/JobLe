// ──────────────────────────────────────────────────────────────
//  Test routes — the API endpoints for creating & fetching tests.
//  These are the URLs the frontend will call.
// ──────────────────────────────────────────────────────────────
const express = require("express");
const Test = require("../models/Test"); // the blueprint we just built
const Result = require("../models/Result"); // one candidate's completed attempt
const Candidate = require("../models/Candidate");
const Assignment = require("../models/Assignment"); // "this test is FOR that candidate"
const auth = require("../middleware/auth"); // the login "bouncer"

// A "router" is a mini-app that groups related routes together.
// We'll plug it into the main app under the "/api/tests" prefix.
const router = express.Router();

// ── CREATE a test ──────────────────────────────────────────────
// POST /api/tests
// The recruiter sends a test (title + questions) in the request body;
// we save it to MongoDB and send back the saved test.
router.post("/", auth, async (req, res) => {
  try {
    // Build the test from the body, but stamp the owner from the TOKEN
    // (req.user) — never trust an owner sent by the client.
    const newTest = await Test.create({
      title: req.body.title,
      questions: req.body.questions,
      passPercent: req.body.passPercent,
      timeLimitMinutes: req.body.timeLimitMinutes,
      owner: req.user.id,
    });

    // If this test was GENERATED FROM a stored candidate's resume, the
    // frontend passes that candidate's id along — and saving the test also
    // ASSIGNS it to them (shows up on their "My tests" page). Owner-scoped
    // lookup so nobody can assign tests to another recruiter's candidate.
    if (req.body.candidateId) {
      const candidate = await Candidate.findOne({
        _id: req.body.candidateId,
        owner: req.user.id,
      });
      if (candidate) {
        await Assignment.findOneAndUpdate(
          { test: newTest._id, candidate: candidate._id },
          { owner: req.user.id, status: "pending" },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }

    res.status(201).json(newTest); // 201 = "Created"
  } catch (error) {
    // If validation fails (e.g. missing title), send a 400 "Bad Request".
    res.status(400).json({ error: error.message });
  }
});

// ── LIST all tests ─────────────────────────────────────────────
// GET /api/tests
// Returns every test (for the recruiter dashboard list).
router.get("/", auth, async (req, res) => {
  try {
    // Only THIS recruiter's tests — filter by the owner from the token.
    const tests = await Test.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message }); // 500 = server error
  }
});

// ── GET ONE test for a CANDIDATE to take ───────────────────────
// GET /api/tests/:id
// The ":id" part is a URL parameter — it's the test's _id from the link
// the recruiter shared. CRITICAL: we strip out `correctIndex` before
// sending, so the candidate's browser never sees the answers.
router.get("/:id", async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: "Test not found" });

    // Rebuild a "safe" version with the answers removed.
    const safeTest = {
      _id: test._id,
      title: test.title,
      description: test.description,
      timeLimitMinutes: test.timeLimitMinutes, // candidate's browser needs this to count down
      questions: test.questions.map((q) => ({
        _id: q._id,
        text: q.text,
        options: q.options,
        // correctIndex is DELIBERATELY left out — never sent to the browser.
      })),
    };

    res.json(safeTest);
  } catch (error) {
    // A malformed id (not a valid Mongo id) lands here too.
    res.status(400).json({ error: error.message });
  }
});

// ── Helper: score a candidate's submission ─────────────────────
//  questions = the FULL questions (with correctIndex) straight from the DB.
//  answers   = the candidate's chosen option index for each question,
//              e.g. [1, 0, 2] means "Q1 -> option 1, Q2 -> option 0, ...".
//
//  TODO (YOUR PART): return how many questions the candidate got right.
//  Loop over the questions; for each one, check whether the candidate's
//  chosen index matches that question's correctIndex; count the matches.
//
//  Hints:
//   • answers[i] is the candidate's pick for questions[i].
//   • questions[i].correctIndex is the right answer for that question.
//   • Start a counter at 0, add 1 on each match, return the counter.
//   • A normal `for` loop is totally fine here — clarity over cleverness.
function scoreSubmission(questions, answers) {
  // Start a tally of correct answers at zero.
  let correct = 0;

  // Walk through every question by its position (i = 0, 1, 2, ...).
  for (let i = 0; i < questions.length; i++) {
    // The candidate's pick for THIS question is answers[i].
    // The right answer for THIS question is questions[i].correctIndex.
    // If they match, the candidate got it right — add one to the tally.
    if (answers[i] === questions[i].correctIndex) {
      correct++;
    }
  }

  // Hand back the final count.
  return correct;
}

// ── SUBMIT answers + get scored ────────────────────────────────
// POST /api/tests/:id/submit
// The candidate sends their chosen answers; the SERVER scores them
// (because correctIndex lives only here) and returns the score.
router.post("/:id/submit", async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: "Test not found" });

    const { answers, candidateName, assignmentId } = req.body;
    let trimmedName = (candidateName || "").trim();

    // TWO DOORS into a test:
    //  - the shared link (no account): identity = the typed name (below)
    //  - an ASSIGNMENT from "My tests": identity = the stored Candidate the
    //    test was assigned to. No typing, and retakes are blocked by the
    //    assignment's status — REAL enforcement, not the honor system.
    let assignment = null;
    if (assignmentId) {
      assignment = await Assignment.findOne({
        _id: assignmentId,
        test: test._id, // the assignment must be FOR this test
      }).populate("candidate", "name email");
      if (!assignment) {
        return res.status(404).json({ error: "Invitation not found." });
      }
      if (assignment.status === "completed") {
        return res
          .status(409)
          .json({ error: "You have already taken this test." });
      }
      // Identity comes from the stored candidate, not the request body.
      trimmedName =
        assignment.candidate?.name || assignment.candidate?.email || "Candidate";
    }

    // Prevent retakes (link door): if someone with this name already submitted
    // THIS test, refuse a second attempt. collation strength:2 makes the name
    // match case-insensitive ("Alice" == "alice") without building a regex
    // from user input. 409 = "Conflict" — the right status for "already exists".
    const alreadyTaken = await Result.findOne({
      testId: test._id,
      candidateName: trimmedName,
    }).collation({ locale: "en", strength: 2 });
    if (alreadyTaken) {
      return res
        .status(409)
        .json({ error: "You have already taken this test." });
    }

    const score = scoreSubmission(test.questions, answers);
    const total = test.questions.length;

    // SAVE this attempt so the recruiter can see it later. This is the
    // "make it permanent" step — without it the score would vanish.
    await Result.create({ testId: test._id, candidateName: trimmedName, score, total, answers });

    // Assignment door: stamp the outcome on the invitation. This score next
    // to the Match row's matchScore is the lie-detector (claim vs proof).
    if (assignment) {
      assignment.status = "completed";
      assignment.score = score;
      assignment.total = total;
      await assignment.save();
    }

    // Did they pass? Convert their score to a % and compare to the threshold.
    // We use >= so scoring EXACTLY the threshold counts as a pass.
    const passed = total > 0 && (score / total) * 100 >= test.passPercent;

    res.json({ score, total, passed, passPercent: test.passPercent });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── GET ONE test WITH answers (recruiter editing view) ─────────
// GET /api/tests/:id/edit
// This is the RECRUITER's view — it includes correctIndex, because you
// can't edit "which answer is correct" without seeing it. We keep it on a
// SEPARATE route from the candidate's GET /:id (which strips the answers),
// so the candidate path can never accidentally leak them.
router.get("/:id/edit", auth, async (req, res) => {
  try {
    // Scope by owner: a recruiter can only edit their OWN tests.
    const test = await Test.findOne({ _id: req.params.id, owner: req.user.id });
    if (!test) return res.status(404).json({ error: "Test not found" });
    res.json(test); // full document, correctIndex included
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── UPDATE a test ──────────────────────────────────────────────
// PUT /api/tests/:id
// Replaces the test's title + questions with the edited versions.
router.put("/:id", auth, async (req, res) => {
  try {
    // findOneAndUpdate with an owner filter = "update it ONLY if it's mine".
    const updated = await Test.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      {
        title: req.body.title,
        questions: req.body.questions,
        passPercent: req.body.passPercent,
        timeLimitMinutes: req.body.timeLimitMinutes,
      },
      { new: true, runValidators: true } // return the UPDATED doc; re-check schema rules
    );
    if (!updated) return res.status(404).json({ error: "Test not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── DELETE a test AND its results ──────────────────────────────
// DELETE /api/tests/:id
// Permanently removes the test, then CASCADES: deletes every Result that
// belonged to it, so we don't leave orphaned records behind.
router.delete("/:id", auth, async (req, res) => {
  try {
    // Only delete it if it belongs to the logged-in recruiter.
    const test = await Test.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!test) return res.status(404).json({ error: "Test not found" });

    // The cascade: wipe every result for this test. deleteMany removes ALL
    // documents that match the filter in one go (could be zero, could be 100).
    await Result.deleteMany({ testId: req.params.id });

    // Also remove any assignments OF this test — otherwise they'd dangle,
    // pointing at a test that no longer exists (stale "test sent" badges +
    // orphan rows). Same cascade hygiene as Results above.
    await Assignment.deleteMany({ test: req.params.id });

    res.json({ message: "Test, its results, and its assignments deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── LIST results for one test (recruiter view) ─────────────────
// GET /api/tests/:id/results
// Returns every candidate's attempt at this test, newest first.
router.get("/:id/results", auth, async (req, res) => {
  try {
    // First confirm this test belongs to the requester — otherwise one
    // recruiter could read another's candidate results.
    const test = await Test.findOne({ _id: req.params.id, owner: req.user.id });
    if (!test) return res.status(404).json({ error: "Test not found" });

    const results = await Result.find({ testId: req.params.id }).sort({
      createdAt: -1,
    });
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
