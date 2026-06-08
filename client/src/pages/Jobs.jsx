import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getJobs, createJob, updateJob, deleteJob } from "../api";

// Recruiter page: list job openings and create new ones. Each job's required
// skills are what we later score resumes against (the match %).
function Jobs() {
  const [jobs, setJobs] = useState(null); // null = still loading
  const [title, setTitle] = useState("");
  const [skillsText, setSkillsText] = useState(""); // comma-separated input
  const [isPublic, setIsPublic] = useState(false); // publish to job board?
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null); // which job's link was copied

  function loadJobs() {
    getJobs()
      .then(setJobs)
      .catch((e) => setError(e.message));
  }

  useEffect(loadJobs, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Please give the job a title.");
      return;
    }
    // Turn "React, Node, SQL" into ["React", "Node", "SQL"] — split on commas,
    // trim each, drop any empties.
    const requiredSkills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      await createJob({ title, requiredSkills, isPublic });
      setTitle("");
      setSkillsText("");
      setIsPublic(false);
      loadJobs(); // refresh the list
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Flip a job between private and published-to-board. Sends ONLY the flag —
  // the backend leaves every other field as it was.
  async function handleTogglePublic(job) {
    try {
      await updateJob(job._id, { isPublic: !job.isPublic });
      loadJobs();
    } catch (err) {
      setError(err.message);
    }
  }

  // Copy this job's public apply link — same share-a-link pattern as tests.
  async function handleCopyApplyLink(jobId) {
    const url = `${window.location.origin}/apply/${jobId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(jobId);
    setTimeout(() => setCopiedId(null), 2000); // reset the button label
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this job?")) return;
    try {
      await deleteJob(id);
      loadJobs();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Jobs</h1>

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium">Job title</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Frontend Developer"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium">Required skills</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="comma-separated, e.g. React, JavaScript, CSS"
          />
          <span className="mt-1 block text-xs text-slate-500">
            These are what we score a candidate's resume against.
          </span>
        </label>

        <label className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm">
            Publish to the public job board (candidates can find it and apply)
          </span>
        </label>

        {error && <p className="mt-4 text-red-600">⚠️ {error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add job"}
        </button>
      </form>

      {/* List */}
      {jobs === null ? (
        <p className="text-slate-500">Loading jobs…</p>
      ) : jobs.length === 0 ? (
        <p className="text-slate-500">No jobs yet. Add one above.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">
                    {job.title}
                    {job.isPublic && (
                      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        On job board
                      </span>
                    )}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {job.requiredSkills.length > 0 ? (
                      job.requiredSkills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        no skills listed
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <button
                    onClick={() => handleTogglePublic(job)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
                  >
                    {job.isPublic ? "Make private" : "Publish"}
                  </button>
                  {job.isPublic && (
                    <button
                      onClick={() => handleCopyApplyLink(job._id)}
                      className="rounded-md border border-blue-600 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50"
                    >
                      {copiedId === job._id ? "Copied!" : "Copy apply link"}
                    </button>
                  )}
                  <Link
                    to={`/jobs/${job._id}/match`}
                    className="rounded-md border border-emerald-600 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    Match one
                  </Link>
                  <Link
                    to={`/jobs/${job._id}/bulk`}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
                  >
                    Applicants
                  </Link>
                  <button
                    onClick={() => handleDelete(job._id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Jobs;
