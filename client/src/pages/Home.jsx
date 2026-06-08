import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getTests, deleteTest } from "../api";

// The recruiter's home page: shows all tests that exist in the database.
// Every time you create a test on the /create page, it will show up here.
function Home() {
  const [tests, setTests] = useState([]);   // the list of tests from the backend
  const [error, setError] = useState("");   // any error message to show the user
  const [loading, setLoading] = useState(true); // true until the first fetch finishes

  // Load the tests once, when this page first appears.
  useEffect(() => {
    getTests()
      .then((data) => setTests(data))   // success -> store them -> screen redraws
      .catch((e) => setError(e.message)) // failure -> show the message
      .finally(() => setLoading(false)); // either way, we're done loading
  }, []); // [] = run only once

  // Delete a test (and its results) after confirming. Because deleting is
  // permanent and irreversible, we ask first — a guardrail against misclicks.
  async function handleDelete(test) {
    const ok = window.confirm(
      `Delete "${test.title}" and ALL its results? This cannot be undone.`
    );
    if (!ok) return; // user backed out

    try {
      await deleteTest(test._id);
      // Remove it from the list locally so the screen updates instantly,
      // without re-fetching everything from the server.
      setTests(tests.filter((t) => t._id !== test._id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your tests</h1>
        <Link
          to="/create"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create Test
        </Link>
      </div>

      {error && <p className="text-red-600">⚠️ {error}</p>}

      {/* While the first fetch is in flight, show a loading line instead of
          flashing the "no tests yet" message. */}
      {loading ? (
        <p className="text-slate-500">Loading tests…</p>
      ) : tests.length === 0 && !error ? (
        <p className="text-slate-500">No tests yet. Create your first one!</p>
      ) : (
        <ul className="space-y-3">
          {tests.map((test) => (
            <li
              key={test._id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div>
                <h2 className="font-semibold">{test.title}</h2>
                <p className="text-sm text-slate-500">
                  {test.questions.length} question
                  {test.questions.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* See who took this test and their scores */}
                <Link
                  to={`/tests/${test._id}/results`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                >
                  View results
                </Link>

                {/* Edit this test — opens the form pre-filled */}
                <Link
                  to={`/tests/${test._id}/edit`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                >
                  Edit
                </Link>

                {/* The link the recruiter sends to candidates. window.location.origin
                    is "http://localhost:5174" now (or your real domain later). */}
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `${window.location.origin}/take/${test._id}`
                    )
                  }
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                >
                  Copy candidate link
                </button>

                {/* Destructive action — styled red to signal "be careful" */}
                <button
                  onClick={() => handleDelete(test)}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Home;
