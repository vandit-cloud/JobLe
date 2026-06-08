import { useState } from "react";

// A brand-new, empty question. Used when adding a question / for a blank form.
export const blankQuestion = () => ({
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

// ──────────────────────────────────────────────────────────────
//  Reusable test form — shared by the Create AND Edit pages.
//  Instead of copy-pasting this whole form twice (and fixing every
//  bug twice), we write it ONCE and let each page configure it.
//
//  Props:
//   • initialTitle, initialQuestions — what to pre-fill. Empty for
//     Create; the existing test's data for Edit.
//   • submitLabel — the button text ("Save test" vs "Update test").
//   • onSave(testData) — what to DO when submitted. Create calls the
//     POST helper; Edit calls the PUT helper. The form doesn't care
//     which — it just hands back { title, questions }.
// ──────────────────────────────────────────────────────────────
function TestForm({
  initialTitle = "",
  initialQuestions = [blankQuestion()],
  initialPassPercent = 50,
  initialTimeLimit = 0,
  submitLabel = "Save test",
  onSave,
}) {
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState(initialQuestions);
  const [passPercent, setPassPercent] = useState(initialPassPercent);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(initialTimeLimit);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false); // true while the save is in flight

  function addQuestion() {
    setQuestions([...questions, blankQuestion()]);
  }

  function updateQuestion(index, value) {
    setQuestions(
      questions.map((q, i) => (i === index ? { ...q, text: value } : q))
    );
  }

  function updateOption(qIndex, optIndex, value) {
    setQuestions(
      questions.map((q, i) =>
        i !== qIndex
          ? q
          : {
              ...q,
              options: q.options.map((opt, j) =>
                j === optIndex ? value : opt
              ),
            }
      )
    );
  }

  function setCorrect(qIndex, optIndex) {
    setQuestions(
      questions.map((q, i) =>
        i === qIndex ? { ...q, correctIndex: optIndex } : q
      )
    );
  }

  // Check the form is filled in properly. Returns an error MESSAGE if
  // something's wrong, or null if everything's good. Keeping validation in
  // its own function (separate from submitting) keeps handleSubmit readable.
  function validate() {
    if (!title.trim()) return "Please give the test a title.";
    if (passPercent < 0 || passPercent > 100)
      return "Passing score must be between 0 and 100.";
    if (timeLimitMinutes < 0) return "Time limit can't be negative.";
    if (questions.length === 0) return "Add at least one question.";

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return `Question ${i + 1} is missing its text.`;
      // .some() returns true if ANY option is blank (after trimming spaces).
      if (q.options.some((opt) => !opt.trim()))
        return `Question ${i + 1} has an empty option — fill all of them.`;
    }
    return null; // no problems found
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Stop here if the form isn't valid — show the message, don't save.
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true); // lock the button so a double-click can't save twice
    try {
      // Hand the finished test back to whichever page is using this form.
      await onSave({ title, questions, passPercent, timeLimitMinutes });
      // On success the page navigates away, so no need to unlock here.
    } catch (err) {
      setError(err.message);
      setSaving(false); // failed — unlock so they can fix it and retry
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="mb-4 text-red-600">⚠️ {error}</p>}

      <label className="block">
        <span className="text-sm font-medium">Test title</span>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. JavaScript Basics"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-medium">Passing score (%)</span>
        <input
          type="number"
          min="0"
          max="100"
          className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2"
          value={passPercent}
          // number inputs give a STRING; Number(...) converts it back so our
          // comparisons (>=) work on numbers, not text.
          onChange={(e) => setPassPercent(Number(e.target.value))}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-medium">Time limit (minutes)</span>
        <input
          type="number"
          min="0"
          className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2"
          value={timeLimitMinutes}
          onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
        />
        <span className="mt-1 block text-xs text-slate-500">
          0 = no time limit
        </span>
      </label>

      <div className="mt-8 space-y-6">
        {questions.map((q, qIndex) => (
          <div
            key={qIndex}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span className="text-sm font-semibold text-slate-500">
              Question {qIndex + 1}
            </span>

            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
              value={q.text}
              onChange={(e) => updateQuestion(qIndex, e.target.value)}
              placeholder="Type the question…"
            />

            <div className="mt-3 space-y-2">
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={q.correctIndex === optIndex}
                    onChange={() => setCorrect(qIndex, optIndex)}
                  />
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5"
                    value={opt}
                    onChange={(e) =>
                      updateOption(qIndex, optIndex, e.target.value)
                    }
                    placeholder={`Option ${optIndex + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={addQuestion}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
        >
          + Add question
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default TestForm;
