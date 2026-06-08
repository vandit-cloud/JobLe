import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  uploadCandidates,
  getCandidates,
  deleteCandidate,
  generateTestFromCandidate,
  getAssignments,
  getCandidateMatches,
} from "../api";

// Recruiter page: the stored TALENT POOL. Resumes uploaded here are parsed
// ONCE (Python /parse) and saved as Candidate documents — so they survive
// reloads and can be matched against any job from the Jobs page.
function Candidates() {
  const [candidates, setCandidates] = useState(null);
  const [assignments, setAssignments] = useState([]); // sent-test status rows
  const [matches, setMatches] = useState([]); // job-match rows (for the job tags)
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null); // candidate id
  const [jobFilter, setJobFilter] = useState(""); // "" = show whole pool
  const navigate = useNavigate();

  function load() {
    getCandidates()
      .then(setCandidates)
      .catch((e) => setError(e.message));
    // Assignments tell us, per candidate, "test sent" / "completed (score)".
    getAssignments()
      .then(setAssignments)
      .catch(() => {}); // status badges are optional decoration — don't block the page
    // Job matches let us tag each person with the job(s) they relate to.
    getCandidateMatches()
      .then(setMatches)
      .catch(() => {}); // also decoration — never block the pool over it
  }
  useEffect(load, []);

  // The LATEST assignment for one candidate (list is sorted newest-first).
  function assignmentFor(candidateId) {
    return assignments.find((a) => a.candidate?._id === candidateId);
  }

  // Every job this candidate applied to / was matched against. We join by id
  // (the endpoint returns candidate as a raw id, not populated).
  function matchesFor(candidateId) {
    return matches.filter((m) => m.candidate === candidateId);
  }

  // Tag colour by fit: green strong, amber middling, red weak — same bands as
  // the Applicants page so a 75% reads the same everywhere.
  function chipColor(score) {
    if (score >= 70) return "bg-emerald-50 text-emerald-700";
    if (score >= 40) return "bg-amber-50 text-amber-700";
    return "bg-red-50 text-red-700";
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");
    if (files.length === 0) {
      setError("Choose one or more resume files first.");
      return;
    }
    setUploading(true);
    try {
      const data = await uploadCandidates(files);
      const failed = data.candidates.filter((c) => c.error);
      if (failed.length > 0) {
        setError(
          `Couldn't parse: ${failed.map((f) => f.sourceFilename).join(", ")}`
        );
      }
      setFiles([]);
      e.target.reset?.();
      load(); // refresh the list from the server — it's the source of truth now
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this candidate and all their match scores?"))
      return;
    try {
      await deleteCandidate(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Same generate → review-in-TestForm flow as BulkMatch, but from the STORED
  // resume text — works even months after the original file is gone.
  async function handleGenerateTest(candidate) {
    setError("");
    setGeneratingFor(candidate._id);
    try {
      const draft = await generateTestFromCandidate(candidate._id);
      if (!draft.questions || draft.questions.length === 0) {
        setError("Couldn't draft questions from that resume.");
        return;
      }
      navigate("/create", {
        state: {
          questions: draft.questions,
          source: draft.source,
          // Carry WHO this test is for — saving it will auto-assign it
          // to this candidate (their "My tests" page picks it up).
          candidateId: candidate._id,
          candidateName: candidate.name || candidate.sourceFilename,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingFor(null);
    }
  }

  // Jobs to offer in the filter dropdown — only those that actually have
  // matched candidates (a unique list pulled from the match rows). Filtering
  // by a job nobody matches would just show an empty table, so we don't list it.
  const jobOptions = Array.from(
    new Map(matches.filter((m) => m.job).map((m) => [m.job._id, m.job.title]))
  ).map(([id, title]) => ({ id, title }));

  // The rows to actually show: the whole pool, or just those matched to the
  // selected job. matchesFor() is the same join the tags use.
  const filtered = !jobFilter
    ? candidates || []
    : (candidates || []).filter((c) =>
        matchesFor(c._id).some((m) => m.job?._id === jobFilter)
      );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Candidates</h1>
      <p className="mb-6 text-slate-500">
        Your stored talent pool. Resumes are parsed once on upload — match them
        against any job from the Jobs page.
      </p>

      <form
        onSubmit={handleUpload}
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFiles(Array.from(e.target.files))}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        {files.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {files.length} file{files.length === 1 ? "" : "s"} selected
          </p>
        )}
        {error && <p className="mt-4 text-red-600">⚠️ {error}</p>}
        <button
          type="submit"
          disabled={uploading}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Parsing & saving…" : "Upload resumes"}
        </button>
      </form>

      {!candidates ? (
        <p className="mt-6 text-slate-500">Loading candidates…</p>
      ) : candidates.length === 0 ? (
        <p className="mt-6 text-slate-500">
          No candidates yet — upload some resumes above.
        </p>
      ) : (
        <>
          {/* Filter the pool down to one job's applicants. Reuses the same
              match data as the job tags — no extra request. */}
          {jobOptions.length > 0 && (
            <div className="mt-6 flex items-center gap-2 text-sm">
              <label htmlFor="jobFilter" className="text-slate-500">
                Filter by job:
              </label>
              <select
                id="jobFilter"
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1"
              >
                <option value="">All candidates ({candidates.length})</option>
                {jobOptions.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="mt-4 text-slate-500">
              No candidates matched to this job yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Skills</th>
                <th className="px-4 py-3 font-medium">Matched jobs</th>
                <th className="px-4 py-3 font-medium">Resume file</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">
                    {c.name || <span className="text-slate-400">unknown</span>}
                    {c.source === "self-applied" && (
                      <span className="ml-2 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                        applied
                      </span>
                    )}
                    {(() => {
                      const a = assignmentFor(c._id);
                      if (!a) return null;
                      return a.status === "completed" ? (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          scored {a.score}/{a.total}
                        </span>
                      ) : (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          test sent
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <div className="max-w-xs">
                      {c.skills.slice(0, 6).join(", ")}
                      {c.skills.length > 6 && ` +${c.skills.length - 6} more`}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const ms = matchesFor(c._id);
                      if (ms.length === 0)
                        return <span className="text-slate-300">—</span>;
                      return (
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {ms.map((m) => (
                            <span
                              key={m._id}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${chipColor(
                                m.matchScore
                              )}`}
                            >
                              {m.job?.title || "job"} {m.matchScore}%
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    <div className="max-w-[10rem] truncate" title={c.sourceFilename}>
                      {c.sourceFilename}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => handleGenerateTest(c)}
                      disabled={generatingFor !== null}
                      className="mr-2 rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {generatingFor === c._id ? "Drafting…" : "Generate test"}
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Candidates;
