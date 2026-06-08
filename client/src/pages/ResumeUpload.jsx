import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeResume, generateTestFromResume } from "../api";

// Recruiter page: upload a candidate's resume (PDF/DOCX) and see the structured
// fields the Python parser pulls out. This is the FIRST piece of Phase 2 — the
// browser talks only to our Node backend, which forwards the file to Python.
function ResumeUpload() {
  const [file, setFile] = useState(null);     // the chosen file
  const [result, setResult] = useState(null); // parsed { email, phone, skills, textLength }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false); // drafting a test
  const navigate = useNavigate();

  async function handleAnalyze(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please choose a resume file first.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeResume(file);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      // Whether it worked or failed, we're done loading — unlock the button.
      setLoading(false);
    }
  }

  // Ask the backend to draft a test from this resume, then hand the draft
  // questions to the Create page (via router state) so the recruiter can
  // review/edit before saving. The AI never touches the candidate's exam —
  // this is a recruiter-side, pre-computed step.
  async function handleGenerateTest() {
    setError("");
    setGenerating(true);
    try {
      const draft = await generateTestFromResume(file);
      if (!draft.questions || draft.questions.length === 0) {
        setError("Couldn't draft any questions from this resume.");
        return;
      }
      navigate("/create", {
        state: { questions: draft.questions, source: draft.source },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Resume parser</h1>

      <form
        onSubmit={handleAnalyze}
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium">Resume file (PDF or DOCX)</span>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files[0] || null)}
            className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
        </label>

        {error && <p className="mt-4 text-red-600">⚠️ {error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Analyze resume"}
        </button>
      </form>

      {/* Show the parsed result once it arrives. */}
      {result && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">
              {result.name || "Parsed details"}
            </h2>
            {/* Which dispatcher tier produced this — Groq, OUR trained model,
                or the regex baseline. */}
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {result.source === "groq"
                ? "✨ AI parsed"
                : result.source === "local-model"
                ? "🧠 our model"
                : "basic parse"}
            </span>
          </div>

          {result.summary && (
            <p className="mb-4 text-sm text-slate-600">{result.summary}</p>
          )}

          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 font-medium text-slate-500">Email</dt>
              <dd>{result.email || <span className="text-slate-400">not found</span>}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 font-medium text-slate-500">Phone</dt>
              <dd>{result.phone || <span className="text-slate-400">not found</span>}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 font-medium text-slate-500">Location</dt>
              <dd>
                {result.location || (
                  <span className="text-slate-400">not found</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-500">
              Skills detected ({result.skills.length})
            </p>
            {result.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No known skills matched. (Grow the list in the parser's skills.py.)
              </p>
            )}
          </div>

          {result.experience && result.experience.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-500">
                Experience ({result.experience.length})
              </p>
              <ul className="space-y-1 text-sm text-slate-700">
                {result.experience.map((e, i) => (
                  <li key={i}>
                    {[e.role, e.company, e.duration].filter(Boolean).join(" · ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.education && result.education.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-500">
                Education ({result.education.length})
              </p>
              <ul className="space-y-1 text-sm text-slate-700">
                {result.education.map((e, i) => (
                  <li key={i}>
                    {[e.degree, e.institution, e.year]
                      .filter(Boolean)
                      .join(" · ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400">
            Extracted {result.textLength} characters of text.
          </p>

          {/* Turn this resume into a draft test the recruiter can review. */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <button
              onClick={handleGenerateTest}
              disabled={generating}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? "Drafting test…" : "Generate test from this resume"}
            </button>
            <p className="mt-2 text-xs text-slate-400">
              Drafts MCQs based on this resume — you'll review and edit before saving.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;
