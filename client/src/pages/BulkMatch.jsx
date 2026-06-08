import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getJob,
  getJobMatches,
  matchStoredCandidates,
  generateTestFromCandidate,
  getAssignments,
} from "../api";

// Recruiter page: the PERSISTENT shortlist for one job. Reads saved Match
// rows from the server (so it survives reloads), and "Match candidates"
// re-scores every STORED candidate against this job — no files involved.
// Resumes are uploaded once on the Candidates page (parse-once / match-many).
function BulkMatch() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [matches, setMatches] = useState(null); // ranked, from Mongo
  const [assignments, setAssignments] = useState([]); // test outcomes (lie-detector)
  const [error, setError] = useState("");
  const [scoring, setScoring] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null); // candidate id
  const navigate = useNavigate();

  useEffect(() => {
    getJob(id)
      .then(setJob)
      .catch((e) => setError(e.message));
    // Load whatever shortlist was saved last time — the whole point.
    getJobMatches(id)
      .then((data) => setMatches(data.matches))
      .catch((e) => setError(e.message));
    // Test assignments join in client-side by candidate id — they put the
    // PROVEN score next to the CLAIMED match % (the lie-detector view).
    getAssignments()
      .then(setAssignments)
      .catch(() => {}); // decoration — never block the shortlist over it
  }, [id]);

  // Latest assignment for one candidate (list comes newest-first).
  function assignmentFor(candidateId) {
    return assignments.find((a) => a.candidate?._id === candidateId);
  }

  // (Re-)score every stored candidate against this job. Safe to re-run:
  // the server UPDATES existing rows instead of duplicating them.
  async function handleMatchAll() {
    setError("");
    setScoring(true);
    try {
      const data = await matchStoredCandidates(id);
      setMatches(data.matches);
    } catch (err) {
      setError(err.message);
    } finally {
      setScoring(false);
    }
  }

  // Same generate → review-in-TestForm flow as before, but from the STORED
  // candidate — no "re-upload the file" failure mode anymore.
  async function handleGenerateTest(candidateId) {
    setError("");
    setGeneratingFor(candidateId);
    try {
      const draft = await generateTestFromCandidate(candidateId);
      if (!draft.questions || draft.questions.length === 0) {
        setError("Couldn't draft questions from that resume.");
        return;
      }
      navigate("/create", {
        state: {
          questions: draft.questions,
          source: draft.source,
          // Carry WHO this test is for — saving will auto-assign it.
          candidateId,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingFor(null);
    }
  }

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
      <h1 className="mb-1 mt-2 text-2xl font-bold">
        Applicants · {job.title}
      </h1>
      <p className="mb-6 text-slate-500">
        Everyone in your talent pool ranked against this job (
        {job.requiredSkills.join(", ") || "no skills listed"}). People who
        applied through the job board show up here automatically; you can also
        score the rest of your pool against this role below.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleMatchAll}
          disabled={scoring}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scoring ? "Scoring…" : "Match all stored candidates"}
        </button>
        <Link
          to="/candidates"
          className="text-sm text-blue-600 hover:underline"
        >
          Upload more resumes →
        </Link>
      </div>
      {error && <p className="mt-4 text-red-600">⚠️ {error}</p>}

      {!matches || matches.length === 0 ? (
        <p className="mt-6 text-slate-500">
          No applicants for this job yet — candidates who apply via the job
          board appear here, or upload resumes on the Candidates page and hit
          "Match all stored candidates".
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Match</th>
                <th className="px-4 py-3 font-medium">Test score</th>
                <th className="px-4 py-3 font-medium">Missing skills</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, i) => (
                <tr key={m._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {m.candidate?.name || "unknown"}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {m.candidate?.sourceFilename}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${scoreColor(m.matchScore)}`}>
                      {m.matchScore}%
                    </span>
                  </td>
                  {/* THE LIE-DETECTOR CELL: resume claim (match %) on the
                      left, proven skill (test %) here. A big gap in either
                      direction is the signal worth a recruiter's attention. */}
                  <td className="whitespace-nowrap px-4 py-3">
                    {(() => {
                      const a = m.candidate && assignmentFor(m.candidate._id);
                      if (!a) return <span className="text-slate-300">—</span>;
                      if (a.status !== "completed")
                        return (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            test sent
                          </span>
                        );
                      const testPercent =
                        a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
                      const gap = m.matchScore - testPercent;
                      return (
                        <>
                          <span className={`font-bold ${scoreColor(testPercent)}`}>
                            {testPercent}%
                          </span>
                          <span className="ml-1 text-xs text-slate-400">
                            ({a.score}/{a.total})
                          </span>
                          {gap >= 30 && (
                            <span
                              className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                              title={`Resume matches ${m.matchScore}% but scored only ${testPercent}% when tested — the claims may be inflated.`}
                            >
                              ⚠ {gap}pt gap
                            </span>
                          )}
                          {gap <= -30 && (
                            <span
                              className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                              title={`Resume only matches ${m.matchScore}% but scored ${testPercent}% when tested — stronger than the resume suggests.`}
                            >
                              💎 hidden gem
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <div className="max-w-xs">
                      {m.missing.length > 0 ? m.missing.join(", ") : "none 🎉"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {m.candidate && (
                      <button
                        onClick={() => handleGenerateTest(m.candidate._id)}
                        disabled={generatingFor !== null}
                        className="rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {generatingFor === m.candidate._id
                          ? "Drafting…"
                          : "Generate test"}
                      </button>
                    )}
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

export default BulkMatch;
