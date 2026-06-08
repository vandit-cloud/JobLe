import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  uploadCandidates,
  getCandidates,
  deleteCandidate,
  generateTestFromCandidate,
  getAssignments,
} from "../api";

// Recruiter page: the stored TALENT POOL. Resumes uploaded here are parsed
// ONCE (Python /parse) and saved as Candidate documents — so they survive
// reloads and can be matched against any job from the Jobs page.
function Candidates() {
  const [candidates, setCandidates] = useState(null);
  const [assignments, setAssignments] = useState([]); // sent-test status rows
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null); // candidate id
  const navigate = useNavigate();

  function load() {
    getCandidates()
      .then(setCandidates)
      .catch((e) => setError(e.message));
    // Assignments tell us, per candidate, "test sent" / "completed (score)".
    getAssignments()
      .then(setAssignments)
      .catch(() => {}); // status badges are optional decoration — don't block the page
  }
  useEffect(load, []);

  // The LATEST assignment for one candidate (list is sorted newest-first).
  function assignmentFor(candidateId) {
    return assignments.find((a) => a.candidate?._id === candidateId);
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
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Skills</th>
                <th className="px-4 py-3 font-medium">Resume file</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
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
    </div>
  );
}

export default Candidates;
