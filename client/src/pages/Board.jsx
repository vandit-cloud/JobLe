import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getBoardJobs } from "../api";

// PUBLIC page: the job board. Anyone — no account — can browse every job
// recruiters chose to publish (isPublic). Each card links to /apply/:id.
// This is the candidate-side mirror of the recruiter's Jobs page.
function Board() {
  const [jobs, setJobs] = useState(null); // null = loading
  const [error, setError] = useState("");

  useEffect(() => {
    getBoardJobs()
      .then(setJobs)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Open positions</h1>
      <p className="mb-6 text-slate-500">
        Browse open roles and apply with your resume — no account needed.
      </p>

      {error && <p className="text-red-600">⚠️ {error}</p>}

      {jobs === null ? (
        <p className="text-slate-500">Loading jobs…</p>
      ) : jobs.length === 0 ? (
        <p className="text-slate-500">No open positions right now.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{job.title}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {/* companyName comes from the populated owner; older
                        accounts may not have one — show a neutral fallback */}
                    {job.owner?.companyName || "Hiring company"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.requiredSkills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  to={`/apply/${job._id}`}
                  className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Board;
