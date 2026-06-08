import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getJob, matchResumeToJob } from "../api";

// Recruiter page: upload a resume and score it against ONE job's required
// skills. Reached from the Jobs list ("Match resume").
function MatchResume() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null); // { matchScore, matchedSkills, missingSkills, candidateSkills }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getJob(id)
      .then(setJob)
      .catch((e) => setError(e.message));
  }, [id]);

  async function handleMatch(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please choose a resume file first.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      setResult(await matchResumeToJob(id, file));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Color the score: green strong, amber middling, red weak.
  function scoreColor(score) {
    if (score >= 70) return "text-emerald-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  }

  if (error && !job) return <p className="text-red-600">⚠️ {error}</p>;
  if (!job) return <p className="text-slate-500">Loading job…</p>;

  return (
    <div>
      <Link to="/jobs" className="text-sm text-blue-600 hover:underline">
        ← Back to jobs
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold">Match resume</h1>
      <p className="mb-6 text-slate-500">
        Scoring against <span className="font-medium">{job.title}</span> (
        {job.requiredSkills.length} required skill
        {job.requiredSkills.length === 1 ? "" : "s"})
      </p>

      <form
        onSubmit={handleMatch}
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files[0] || null)}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        {error && <p className="mt-4 text-red-600">⚠️ {error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Scoring…" : "Score this resume"}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Match score</p>
          <p className={`text-5xl font-bold ${scoreColor(result.matchScore)}`}>
            {result.matchScore}%
          </p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-emerald-700">
                ✓ Matched ({result.matchedSkills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills.length > 0 ? (
                  result.matchedSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">none</span>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-red-700">
                ✗ Missing ({result.missingSkills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {result.missingSkills.length > 0 ? (
                  result.missingSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">none</span>
                )}
              </div>
            </div>
          </div>

          {result.candidateSkills && result.candidateSkills.length > 0 && (
            <p className="mt-6 text-xs text-slate-400">
              Other skills detected on the resume:{" "}
              {result.candidateSkills.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default MatchResume;
