import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getResults, getTestForEdit } from "../api";

// Recruiter's view of who took a test and how they scored. Click a candidate
// to expand their per-question breakdown (which ones they missed).
function Results() {
  const { id } = useParams();
  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null); // needed for question text + correct answers
  const [openId, setOpenId] = useState(null); // which candidate row is expanded
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch BOTH at once: the attempts, and the test (to know what's correct).
    Promise.all([getResults(id), getTestForEdit(id)])
      .then(([resultsData, testData]) => {
        setResults(resultsData);
        setTest(testData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600 hover:underline">
        ← Back to tests
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">
        Results{test ? ` — ${test.title}` : ""}
      </h1>

      {error && <p className="text-red-600">⚠️ {error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading results…</p>
      ) : results.length === 0 && !error ? (
        <p className="text-slate-500">No one has taken this test yet.</p>
      ) : (
        <ul className="space-y-3">
          {results.map((r) => {
            const open = openId === r._id;
            // Recompute pass/fail here for display, using the test's threshold.
            const passed =
              test && r.total > 0 && (r.score / r.total) * 100 >= test.passPercent;
            return (
              <li
                key={r._id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                {/* The clickable header row: name + score + expand caret */}
                <button
                  onClick={() => setOpenId(open ? null : r._id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
                >
                  <span className="font-medium">{r.candidateName}</span>
                  <span className="flex items-center gap-3 text-slate-600">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        passed
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {passed ? "Pass" : "Fail"}
                    </span>
                    {r.score} / {r.total}
                    <span className="text-slate-400">{open ? "▲" : "▼"}</span>
                  </span>
                </button>

                {/* The expanded breakdown: one line per question */}
                {open && test && (
                  <div className="space-y-3 border-t border-slate-100 px-5 py-4">
                    {test.questions.map((q, i) => {
                      const picked = r.answers[i]; // candidate's chosen index
                      const isCorrect = picked === q.correctIndex;
                      return (
                        <div key={q._id} className="text-sm">
                          <p className="font-medium">
                            <span
                              className={
                                isCorrect ? "text-green-600" : "text-red-600"
                              }
                            >
                              {isCorrect ? "✓" : "✗"}
                            </span>{" "}
                            {i + 1}. {q.text}
                          </p>
                          <p className="ml-5 text-slate-500">
                            Their answer:{" "}
                            {picked === undefined || picked === null
                              ? "— (not answered)"
                              : q.options[picked]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Results;
