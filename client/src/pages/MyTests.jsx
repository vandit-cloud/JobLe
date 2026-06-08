import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyAssignments } from "../api";

// CANDIDATE page: the tests recruiters have sent me. Assignments are linked
// to this account by EMAIL (the email parsed from the resume you applied
// with must match your login email). Taking a test from here carries the
// assignment id, so no name-typing — your identity comes from the invite.
function MyTests() {
  const [assignments, setAssignments] = useState(null); // null = loading
  const [error, setError] = useState("");

  useEffect(() => {
    getMyAssignments()
      .then(setAssignments)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">My tests</h1>
      <p className="mb-6 text-slate-500">
        Tests companies have sent you after reviewing your application.
      </p>

      {error && <p className="text-red-600">⚠️ {error}</p>}

      {assignments === null ? (
        <p className="text-slate-500">Loading…</p>
      ) : assignments.length === 0 ? (
        <p className="text-slate-500">
          No tests yet. When a company sends you one, it shows up here. (Tip:
          they find you by the email on your resume — make sure it matches the
          one you registered with.)
        </p>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <div
              key={a._id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{a.test?.title || "Test"}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {a.owner?.companyName || "Hiring company"}
                    {a.test?.timeLimitMinutes > 0 &&
                      ` · ${a.test.timeLimitMinutes} min time limit`}
                  </p>
                </div>

                {a.status === "completed" ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                    Done · {a.score}/{a.total}
                  </span>
                ) : (
                  <Link
                    // The ?assignment= part is what tells TakeTest (and the
                    // server) WHO is taking it — no name typing needed.
                    to={`/take/${a.test?._id}?assignment=${a._id}`}
                    className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Take test
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyTests;
