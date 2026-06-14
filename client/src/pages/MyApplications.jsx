import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyApplications } from "../api";

// CANDIDATE page: the jobs I've applied to. Like "My tests", these are
// linked to this account by EMAIL — the email on the resume I applied with
// must match my login email. Applying logged-OUT still works; the
// application shows up here the moment I log in with that same email.
function MyApplications() {
  const [applications, setApplications] = useState(null); // null = loading
  const [error, setError] = useState("");

  useEffect(() => {
    getMyApplications()
      .then(setApplications)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">My applications</h1>
      <p className="mb-6 text-slate-500">
        Jobs you've applied to. Companies review these and may send you a test.
      </p>

      {error && <p className="text-red-600">⚠️ {error}</p>}

      {applications === null ? (
        <p className="text-slate-500">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="text-slate-500">
          No applications yet.{" "}
          <Link to="/board" className="text-blue-600 hover:underline">
            Browse the job board
          </Link>{" "}
          to apply. (Tip: companies find you by the email on your resume — make
          sure it matches the one you registered with.)
        </p>
      ) : (
        <div className="space-y-4">
          {applications.map((a) => (
            <div
              key={a._id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{a.jobTitle}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {a.company}
                    {a.appliedAt &&
                      ` · applied ${new Date(a.appliedAt).toLocaleDateString()}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {/* Your resume-vs-job match — the same "% you saw when you
                      applied", shown only when scoring succeeded. */}
                  {a.matchScore !== null && (
                    <span className="text-sm text-slate-500">
                      {a.matchScore}% match
                    </span>
                  )}
                  <span className="rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold capitalize text-blue-700">
                    {a.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyApplications;
