import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getBoardJob, applyToJob } from "../api";

// PUBLIC page: apply to one job — reached from the board OR directly via a
// shared /apply/:jobId link (same share-a-link pattern as taking a test).
// Upload a resume; the backend parses it into the recruiter's talent pool
// and auto-scores it against this job.
function Apply() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState(null); // set = success screen

  useEffect(() => {
    getBoardJob(jobId)
      .then(setJob)
      .catch((e) => setError(e.message));
  }, [jobId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please choose your resume file first.");
      return;
    }
    setSending(true);
    try {
      setConfirmation(await applyToJob(jobId, file));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (error && !job) {
    return <p className="text-red-600">⚠️ {error}</p>;
  }
  if (!job) {
    return <p className="text-slate-500">Loading…</p>;
  }

  // ── Success screen (replaces the form after applying) ─────────
  if (confirmation) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-3xl">🎉</p>
        <h1 className="mt-2 text-xl font-bold text-emerald-800">
          {confirmation.message}
        </h1>
        <p className="mt-2 text-emerald-700">
          Your application for <strong>{confirmation.jobTitle}</strong> has
          been sent to the recruiter.
        </p>
        <Link
          to="/board"
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to all jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/board" className="text-sm text-blue-600 hover:underline">
        ← All jobs
      </Link>

      <h1 className="mt-2 text-2xl font-bold">{job.title}</h1>
      <p className="mt-0.5 text-slate-500">
        {job.owner?.companyName || "Hiring company"}
      </p>

      {job.description && (
        <p className="mt-4 text-sm text-slate-600">{job.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {job.requiredSkills.map((s) => (
          <span
            key={s}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
          >
            {s}
          </span>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <span className="text-sm font-medium">Your resume</span>
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files[0])}
          className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />

        {error && <p className="mt-4 text-red-600">⚠️ {error}</p>}

        <button
          type="submit"
          disabled={sending}
          className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending application…" : "Apply with this resume"}
        </button>
      </form>
    </div>
  );
}

export default Apply;
