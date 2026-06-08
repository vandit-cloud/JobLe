// ──────────────────────────────────────────────────────────────
//  resumeClient — ONE place that knows how to talk to the Python
//  resume service. Before this file, parseFile/match calls were
//  copy-pasted into candidates.js and jobs.js; a third copy for the
//  board routes was the smell that forced the extraction (same reuse
//  lesson as TestForm on the frontend).
// ──────────────────────────────────────────────────────────────

const RESUME_SERVICE_URL =
  process.env.RESUME_SERVICE_URL || "http://localhost:8000";

// Parse ONE uploaded file (a multer file object) via Python /parse.
// Returns the parsed fields including resumeText. Throws if parsing fails.
async function parseFile(file) {
  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype });
  form.append("resume", blob, file.originalname);

  const response = await fetch(`${RESUME_SERVICE_URL}/parse`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error("Resume service could not parse the file.");
  return response.json();
}

// Score STORED resume text against a job's required skills via Python
// /match-text (the parse-once/match-many path — no file involved).
async function matchText(text, requiredSkills) {
  const response = await fetch(`${RESUME_SERVICE_URL}/match-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, required_skills: requiredSkills }),
  });
  if (!response.ok) throw new Error("Resume service could not score the text.");
  return response.json();
}

// Score ONE uploaded file against required skills via Python /match
// (parse + match fused, for one-off checks where we don't store anything).
async function matchFileToSkills(file, requiredSkills) {
  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype });
  form.append("resume", blob, file.originalname);
  form.append("required_skills", JSON.stringify(requiredSkills));

  const response = await fetch(`${RESUME_SERVICE_URL}/match`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error("Resume service could not score the file.");
  return response.json();
}

module.exports = { RESUME_SERVICE_URL, parseFile, matchText, matchFileToSkills };
