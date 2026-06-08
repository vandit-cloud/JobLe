import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { getTest, submitTest, getAssignmentStatus } from "../api";

// The way OUT of the score screen. The exam page hides the whole nav bar (so
// nobody can escape mid-test), which means a finished candidate would otherwise
// be stranded with no link — so the exits live here, on the done screens only.
//  • Arrived via an invitation (assignmentId set ⇒ a logged-in candidate):
//    offer both "Back to My tests" and "Browse jobs".
//  • Arrived via a plain shared link: just "Browse jobs" → /board, where the
//    normal nav reappears.
// Declared at module scope (not inside TakeTest) so React doesn't recreate it
// every render — the same reuse rule TestForm follows.
function ExitLinks({ assignmentId }) {
  const primary =
    "rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700";
  const secondary =
    "rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100";
  return (
    <div className="mt-8 flex justify-center gap-3">
      {assignmentId && (
        <Link to="/my-tests" className={primary}>
          Back to My tests
        </Link>
      )}
      {/* Sole button on the link door, so it's the primary one there. */}
      <Link to="/board" className={assignmentId ? secondary : primary}>
        Browse jobs
      </Link>
    </div>
  );
}

// The CANDIDATE's page. Two doors lead here:
//   /take/<test id>                      — the shared link (typed name)
//   /take/<test id>?assignment=<id>      — from "My tests" (identity comes
//                                          from the assignment; no typing)
function TakeTest() {
  // useParams() reads the ":id" piece out of the URL for us.
  const { id } = useParams();
  // useSearchParams reads the "?assignment=..." part (the query string).
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignment"); // null on the link door

  const [test, setTest] = useState(null);     // the test (answers hidden!)
  const [name, setName] = useState("");       // who is taking the test
  const [answers, setAnswers] = useState([]); // candidate's picks, one per question
  const [result, setResult] = useState(null); // { score, total } after submitting
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false); // true while submitting
  // false until the candidate enters their name and clicks "Start test".
  // The questions (and the clock) only appear AFTER this is true.
  const [started, setStarted] = useState(false);
  // How many seconds the candidate has left. null = this test has NO timer,
  // so we never show or run a countdown for it. Set when the test starts.
  const [secondsLeft, setSecondsLeft] = useState(null);

  // If we came through an invitation that's ALREADY completed, this holds its
  // { score, total } and we show "done" instead of the test. Checked on load —
  // otherwise a reload would let the candidate re-answer everything only to be
  // rejected at submit (the server still enforces it there; this is the UX half).
  const [alreadyDone, setAlreadyDone] = useState(null);

  // Load the test once, using the id from the URL.
  useEffect(() => {
    getTest(id)
      .then((data) => {
        setTest(data);
        // Start with NO answer chosen for each question. We fill an array
        // the same length as the questions, all set to null ("not answered").
        setAnswers(new Array(data.questions.length).fill(null));
      })
      .catch((e) => setError(e.message));

    // Assignment door: ask the server whether this invitation is already
    // used up BEFORE showing the start gate.
    if (assignmentId) {
      getAssignmentStatus(assignmentId)
        .then((s) => {
          if (s.status === "completed") {
            setAlreadyDone({ score: s.score, total: s.total });
          }
        })
        .catch(() => {}); // status check failing shouldn't block the test —
      // the submit route still enforces the rules.
    }
  }, [id, assignmentId]);

  // Begin the attempt: require a name, then reveal the questions and — if this
  // test is timed — start the countdown from this exact moment. Putting the
  // clock here (not on load) is the whole point of the gate: the candidate
  // never loses seconds to reading instructions or a slow page load.
  // On the ASSIGNMENT door the name check is skipped — identity comes from
  // the invitation, server-side.
  function startTest() {
    if (!assignmentId && !name.trim()) {
      setError("Please enter your name to begin.");
      return;
    }
    setError("");
    if (test.timeLimitMinutes > 0) {
      setSecondsLeft(test.timeLimitMinutes * 60); // minutes -> seconds
    }
    setStarted(true);
  }

  // ──────────────────────────────────────────────────────────────
  //  TODO (YOUR PART): the countdown tick.
  //  Write a useEffect that, ONCE A SECOND, drops secondsLeft by one.
  //
  //  This is the heart of the timer. Three things to get right:
  //   1. GUARD: do nothing if there's no active timer or it's already
  //      finished — i.e. return early when secondsLeft is null or <= 0.
  //   2. TICK: use setInterval(..., 1000). Inside it, update with the
  //      FUNCTIONAL form: setSecondsLeft((s) => s - 1). (Why? A plain
  //      setSecondsLeft(secondsLeft - 1) would capture a STALE value from
  //      the render the interval was created in. The (s) => ... form always
  //      gets React's latest value.)
  //   3. CLEANUP: return () => clearInterval(theId). React runs this when
  //      the effect re-runs or the page unmounts — without it you'd stack up
  //      multiple intervals and the clock would race.
  //
  //  Dependency array: [secondsLeft]. Each tick re-runs the effect, which
  //  clears the old interval and arms a fresh one — and the guard in step 1
  //  cleanly stops everything the moment it reaches 0.
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. GUARD: no active timer, or it already finished — do nothing.
    if (secondsLeft === null || secondsLeft <= 0) return;

    // 2. TICK: once a second, drop the clock by one. The (s) => s - 1 form
    //    always uses React's latest value, never a stale captured one.
    const intervalId = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    // 3. CLEANUP: clear the interval before the effect re-runs (every tick)
    //    or the page unmounts, so intervals never stack up.
    return () => clearInterval(intervalId);
  }, [secondsLeft]);

  // When the clock hits exactly 0, force a submit with whatever's answered.
  // (Separate from the tick above so each effect does ONE job.) sendAnswers
  // itself guards against double-submitting, so this is safe.
  useEffect(() => {
    if (secondsLeft === 0) sendAnswers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  // Turn a count of seconds into a friendly "M:SS" clock, e.g. 125 -> "2:05".
  function formatTime(total) {
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    // padStart makes "5" -> "05" so it always reads like a real clock.
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  // ──────────────────────────────────────────────────────────────
  //  TODO (YOUR PART): selectAnswer
  //  Runs when the candidate clicks an option for a question.
  //  Record that, for question `qIndex`, they chose option `optIndex`.
  //  This is the SAME immutable-array pattern you saw in updateQuestion:
  //  build a NEW answers array where only position qIndex changes to
  //  optIndex, then setAnswers(...) with it.
  //
  //  Hint: answers.map((picked, i) => i === qIndex ? optIndex : picked)
  // ──────────────────────────────────────────────────────────────
  function selectAnswer(qIndex, optIndex) {
    // YOUR CODE HERE
    setAnswers(answers.map((picked, i) => (i === qIndex ? optIndex : picked)));
  }

  // The one place answers actually get sent. Called both by a manual submit
  // and by the timer hitting 0 — the name is already captured at the gate, so
  // both paths are identical here.
  async function sendAnswers() {
    // Guard: never fire twice, and never after we already have a result.
    // (The timer could tick to 0 the same instant they click Submit.)
    if (submitting || result) return;

    setError("");
    setSubmitting(true);
    try {
      const res = await submitTest(id, answers, name.trim(), assignmentId);
      setResult(res); // store { score, total } -> the score screen shows
    } catch (err) {
      setError(err.message);
      setSubmitting(false); // failed — let them retry
    }
  }

  // The form's onSubmit — a normal, candidate-initiated submit.
  function handleSubmit(e) {
    e.preventDefault();
    sendAnswers();
  }

  // ── What to show, depending on state ──────────────────────────
  // Only a LOAD failure (no test yet) takes over the whole page. Once the test
  // is loaded, errors (blank name, failed submit) show inline on each screen.
  if (error && !test) return <p className="text-red-600">⚠️ {error}</p>;
  if (!test) return <p className="text-slate-500">Loading test…</p>;

  // Invitation already used — show the recorded outcome instead of the gate.
  if (alreadyDone) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">Already completed ✓</h1>
        <p className="mt-2 text-slate-500">
          You've already taken this test — each invitation works once.
        </p>
        <p className="mt-4 text-4xl font-bold text-blue-600">
          {alreadyDone.score} / {alreadyDone.total}
        </p>
        <p className="mt-2 text-slate-500">your recorded score</p>
        <ExitLinks assignmentId={assignmentId} />
      </div>
    );
  }

  // After submitting, show the score instead of the form.
  if (result) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">All done! 🎉</h1>
        <p className="mt-4 text-4xl font-bold text-blue-600">
          {result.score} / {result.total}
        </p>
        <p className="mt-2 text-slate-500">questions correct</p>

        {/* Pass / fail outcome, based on the recruiter's threshold. */}
        <p
          className={`mt-4 inline-block rounded-full px-4 py-1 text-sm font-semibold ${
            result.passed
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {result.passed ? "Passed ✓" : "Did not pass ✗"}
        </p>
        <ExitLinks assignmentId={assignmentId} />
      </div>
    );
  }

  // The GATE: before the test begins, collect the candidate's name. For a
  // timed test, the clock doesn't start until they click "Start test" here,
  // so reading this screen costs them no exam time.
  if (!started) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">{test.title}</h1>
        <p className="mt-2 text-slate-500">
          {test.questions.length} question
          {test.questions.length === 1 ? "" : "s"}
          {test.timeLimitMinutes > 0
            ? ` · ${test.timeLimitMinutes} minute time limit`
            : " · no time limit"}
        </p>

        {error && <p className="mt-4 text-red-600">⚠️ {error}</p>}

        {/* Name input only on the LINK door. From "My tests" the invitation
            already knows who you are. */}
        {assignmentId ? (
          <p className="mt-6 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
            ✓ You're taking this test through your invitation — no name needed.
          </p>
        ) : (
          <label className="mt-6 block">
            <span className="text-sm font-medium">Your name</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice Johnson"
            />
          </label>
        )}

        {test.timeLimitMinutes > 0 && (
          <p className="mt-4 text-sm text-amber-700">
            ⏱ Once you start, the {test.timeLimitMinutes}-minute clock runs
            continuously — it won't pause. The test auto-submits when time runs
            out.
          </p>
        )}

        <button
          onClick={startTest}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Start test
        </button>
      </div>
    );
  }

  // Otherwise, show the test.
  return (
    <form onSubmit={handleSubmit}>
      <h1 className="mb-4 text-2xl font-bold">{test.title}</h1>

      {/* Countdown — only shown when this test has a timer (secondsLeft set).
          Goes red in the final minute as a warning. */}
      {secondsLeft !== null && (
        <p
          className={`mb-6 inline-block rounded-full px-4 py-1 text-sm font-semibold ${
            secondsLeft <= 60
              ? "bg-red-100 text-red-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          ⏱ Time left: {formatTime(secondsLeft)}
        </p>
      )}

      {/* Inline errors during the test (e.g. a failed submit). */}
      {error && <p className="mb-4 text-red-600">⚠️ {error}</p>}

      <div className="space-y-6">
        {test.questions.map((q, qIndex) => (
          <div
            key={q._id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="font-medium">
              {qIndex + 1}. {q.text}
            </p>

            <div className="mt-3 space-y-2">
              {q.options.map((opt, optIndex) => (
                <label key={optIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q-${qIndex}`} // same name per question = pick only one
                    checked={answers[qIndex] === optIndex}
                    onChange={() => selectAnswer(qIndex, optIndex)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit answers"}
      </button>
    </form>
  );
}

export default TakeTest;
