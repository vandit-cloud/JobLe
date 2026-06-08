// One place to define where our backend lives.
// If the backend URL ever changes (e.g. when we deploy), we edit it here ONCE
// instead of hunting through every file.
export const API_URL = "http://localhost:5000/api";

// Returns the auth header IF we have a saved token, else nothing. We spread
// this into recruiter requests: headers: { ...authHeaders() }.
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── register / login ───────────────────────────────────────────
// Both POST to the auth routes and return { token, email, companyName, role }.
export async function register(email, password, companyName, role) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, companyName, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}

// ── createTest ─────────────────────────────────────────────────
// Sends a new test to the backend (POST /api/tests) and returns the
// saved test. We keep all fetch() details in here so our React pages
// stay clean and only think about "give me a test, get one back".
export async function createTest(test) {
  const res = await fetch(`${API_URL}/tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(test),                       // turn our JS object into JSON text
  });

  // fetch() does NOT throw on a 400/500 — we must check ourselves.
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create test");
  }
  return res.json();
}

// ── getTests ───────────────────────────────────────────────────
// Fetches every test (GET /api/tests) for the recruiter dashboard list.
export async function getTests() {
  const res = await fetch(`${API_URL}/tests`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Failed to load tests");
  return res.json();
}

// ── getTest ────────────────────────────────────────────────────
// Fetches ONE test by id (GET /api/tests/:id) for a candidate to take.
// Remember: the backend strips out the answers, so this is the "safe" view.
export async function getTest(id) {
  const res = await fetch(`${API_URL}/tests/${id}`);
  if (!res.ok) throw new Error("Test not found");
  return res.json();
}

// ── submitTest ─────────────────────────────────────────────────
// Sends the candidate's chosen answers (POST /api/tests/:id/submit) and
// returns the server-calculated { score, total }. assignmentId is set when
// the test was opened from "My tests" — the server then takes identity from
// the assignment instead of the typed name.
export async function submitTest(id, answers, candidateName, assignmentId) {
  const res = await fetch(`${API_URL}/tests/${id}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, candidateName, assignmentId }),
  });
  if (!res.ok) {
    // Surface the server's specific reason (e.g. "already taken") when there
    // is one; .catch handles a non-JSON body so we never crash on res.json().
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit answers");
  }
  return res.json();
}

// ── getTestForEdit ─────────────────────────────────────────────
// Fetches ONE test WITH its answers (GET /api/tests/:id/edit) so the
// recruiter can edit it. (Different from getTest, which hides answers.)
export async function getTestForEdit(id) {
  const res = await fetch(`${API_URL}/tests/${id}/edit`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Test not found");
  return res.json();
}

// ── updateTest ─────────────────────────────────────────────────
// Saves edits to an existing test (PUT /api/tests/:id).
export async function updateTest(id, test) {
  const res = await fetch(`${API_URL}/tests/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(test),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update test");
  }
  return res.json();
}

// ── deleteTest ─────────────────────────────────────────────────
// Permanently deletes a test and all its results (DELETE /api/tests/:id).
export async function deleteTest(id) {
  const res = await fetch(`${API_URL}/tests/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to delete test");
  return res.json();
}

// ── analyzeResume ──────────────────────────────────────────────
// Uploads a resume FILE (multipart) to POST /api/resume/analyze, which forwards
// it to the Python parser service. Returns { email, phone, skills, textLength }.
export async function analyzeResume(file) {
  const form = new FormData();
  form.append("resume", file); // "resume" MUST match multer's upload.single("resume")

  const res = await fetch(`${API_URL}/resume/analyze`, {
    method: "POST",
    // IMPORTANT: do NOT set Content-Type here. For multipart uploads the
    // browser must set it itself (it includes a random "boundary" marker);
    // setting it by hand breaks the upload. We still send the auth header.
    headers: { ...authHeaders() },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to analyze resume");
  }
  return res.json();
}

// ── generateTestFromResume ─────────────────────────────────────
// Uploads a resume and asks the backend to DRAFT a test from it (POST
// /api/resume/generate-test → Python). Returns { questions, source, skillsCovered }.
export async function generateTestFromResume(file) {
  const form = new FormData();
  form.append("resume", file); // same field name multer expects

  const res = await fetch(`${API_URL}/resume/generate-test`, {
    method: "POST",
    headers: { ...authHeaders() }, // again: NO manual Content-Type for uploads
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate test");
  }
  return res.json();
}

// ── Jobs ────────────────────────────────────────────────────────
export async function getJobs() {
  const res = await fetch(`${API_URL}/jobs`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Failed to load jobs");
  return res.json();
}

export async function getJob(id) {
  const res = await fetch(`${API_URL}/jobs/${id}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

export async function createJob(job) {
  const res = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(job), // { title, requiredSkills:[...], description }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create job");
  }
  return res.json();
}

// Update a job. Sending a PARTIAL object is fine — the backend ignores
// missing keys — so the publish toggle can send just { isPublic: true }.
export async function updateJob(id, changes) {
  const res = await fetch(`${API_URL}/jobs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(changes),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update job");
  }
  return res.json();
}

export async function deleteJob(id) {
  const res = await fetch(`${API_URL}/jobs/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to delete job");
  return res.json();
}

// Score MANY resumes against a job at once → { jobTitle, results:[...] } ranked.
export async function matchBulk(jobId, files) {
  const form = new FormData();
  // Append each file under the SAME field name "resumes" — that's how multer's
  // upload.array("resumes") receives a list.
  for (const f of files) form.append("resumes", f);

  const res = await fetch(`${API_URL}/jobs/${jobId}/match-bulk`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to score resumes");
  }
  return res.json();
}

// Score a resume against a job → { matchScore, matchedSkills, missingSkills, candidateSkills }
export async function matchResumeToJob(jobId, file) {
  const form = new FormData();
  form.append("resume", file);
  const res = await fetch(`${API_URL}/jobs/${jobId}/match`, {
    method: "POST",
    headers: { ...authHeaders() }, // no manual Content-Type for uploads
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to score resume");
  }
  return res.json();
}

// ── Candidates (stored talent pool — parse-once) ───────────────
// Upload many resumes; each is parsed ONCE by the Python service and saved
// as a Candidate in Mongo. Returns { candidates: [...] } summaries.
export async function uploadCandidates(files) {
  const form = new FormData();
  for (const f of files) form.append("resumes", f); // multer upload.array("resumes")

  const res = await fetch(`${API_URL}/candidates/upload`, {
    method: "POST",
    headers: { ...authHeaders() }, // no manual Content-Type for uploads
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to upload candidates");
  }
  return res.json();
}

export async function getCandidates() {
  const res = await fetch(`${API_URL}/candidates`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load candidates");
  return res.json();
}

// Every job-match for my candidates → [{ _id, candidate, job:{_id,title}, matchScore }].
// candidate is the raw id (not populated); the Candidates page joins by it to
// show, on each row, which job(s) that person applied to / was matched against.
export async function getCandidateMatches() {
  const res = await fetch(`${API_URL}/candidates/matches`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load candidate matches");
  return res.json();
}

export async function deleteCandidate(id) {
  const res = await fetch(`${API_URL}/candidates/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to delete candidate");
  return res.json();
}

// Draft an AI test from a STORED candidate's resume text — no file needed,
// works long after upload. Same draft shape as generateTestFromResume.
export async function generateTestFromCandidate(id) {
  const res = await fetch(`${API_URL}/candidates/${id}/generate-test`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate test");
  }
  return res.json();
}

// ── Stored matches (match-many) ────────────────────────────────
// Score every stored candidate against a job; results are SAVED server-side.
export async function matchStoredCandidates(jobId) {
  const res = await fetch(`${API_URL}/jobs/${jobId}/match-stored`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to match candidates");
  }
  return res.json();
}

// Read the saved ranked shortlist for a job (survives reloads — from Mongo).
export async function getJobMatches(jobId) {
  const res = await fetch(`${API_URL}/jobs/${jobId}/matches`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load matches");
  return res.json();
}

// ── Assignments ("this test is for that candidate") ───────────
// Recruiter: all my assignments, for status badges on the Candidates page.
export async function getAssignments() {
  const res = await fetch(`${API_URL}/assignments`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load assignments");
  return res.json();
}

// Public: one assignment's status — the take-test page checks this on load
// so a finished test shows "already done" instead of a fresh start gate.
export async function getAssignmentStatus(id) {
  const res = await fetch(`${API_URL}/assignments/${id}/status`);
  if (!res.ok) throw new Error("Invitation not found");
  return res.json();
}

// Candidate: the tests waiting for ME (linked to my account by email).
export async function getMyAssignments() {
  const res = await fetch(`${API_URL}/assignments/mine`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load your tests");
  return res.json();
}

// ── Public job board (candidate-facing — NO auth headers) ──────
export async function getBoardJobs() {
  const res = await fetch(`${API_URL}/board`);
  if (!res.ok) throw new Error("Failed to load the job board");
  return res.json();
}

export async function getBoardJob(jobId) {
  const res = await fetch(`${API_URL}/board/${jobId}`);
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

// Apply to a public job with a resume file. Returns the confirmation
// { message, jobTitle, matchScore }.
export async function applyToJob(jobId, file) {
  const form = new FormData();
  form.append("resume", file); // matches multer upload.single("resume")

  const res = await fetch(`${API_URL}/board/${jobId}/apply`, {
    method: "POST",
    body: form, // no manual Content-Type for uploads (boundary!)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit application");
  }
  return res.json();
}

// ── getResults ─────────────────────────────────────────────────
// Fetches all candidate attempts for one test (GET /api/tests/:id/results),
// for the recruiter's results page.
export async function getResults(id) {
  const res = await fetch(`${API_URL}/tests/${id}/results`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to load results");
  return res.json();
}
