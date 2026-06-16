# TalentLeague — Project Context for Claude

> **Read this first.** This file is the shared brain for the project. It exists so that
> any Claude instance, on any teammate's machine, understands what we're building, *why*
> the architecture is the way it is, and how to work on it without breaking things.
> The lead keeps richer running notes in private local memory; this file is the part
> that everyone shares.

---

## 1. What we're building

**TalentLeague** — an AI-powered remote hiring platform. The core loop:

1. A **recruiter** posts jobs and uploads candidate resumes (or candidates self-apply via a public job board).
2. The system **parses** each resume into structured data (skills, contact, experience…) and **matches** it against a job's required skills, producing a ranked shortlist.
3. The recruiter can **generate a resume-specific test** (AI-drafted MCQs) and send it to a candidate.
4. The candidate **takes the timed test** online; the server scores it.
5. The recruiter sees **resume match % (the claim) next to test score % (the proof)** — the "lie-detector" view that flags inflated resumes.

This is a fresh rebuild. Six earlier attempts died (the lead has them archived elsewhere); the feature inventories from two of them live in `ORIGINAL_FEATURES.md` and `ABC_MAIN1_FEATURES.md` for reference only — **we are not continuing any old variant.**

## 2. The team & how we work

- The team is **5 people, mostly beginners** (comfortable with some HTML/JS/Python, but new to building a full app end-to-end). No fixed deadline.
- The **lead** does frontend + backend and reviews/merges everyone's work. Others own feature slices (backend models/APIs, recruiter dashboard UI, candidate exam screen).
- **Work is split by FEATURE (vertical slices), not by layer.** One person owns a feature's screen *and* its API *and* its DB model. Beginners who split by layer get blocked waiting on each other — that's part of why earlier attempts died.
- **When helping a teammate: meet them at a beginner level, keep scope small, and explain the "why," not just the "what."** Tie things to fundamentals when it helps them learn.

### Git flow
- Everyone currently commits to **`main`** (simple, fine while the team is small and in sync). Repo: **`github.com/vandit-cloud/JobLe`** (private).
- If a broken push starts hurting people, graduate to `feature/*` branches → Pull Request → lead reviews/merges. The repo is already set up for that switch.

## 3. THE GOLDEN RULES (do not violate without discussing with the lead)

1. **Never merge runtimes or databases.** This is polyglot by design: JavaScript app + Python AI services, talking **only over HTTP**. A previous attempt died from pasting a Python+Postgres backend into a Node+Mongo repo. To add any AI feature, wrap it as its own HTTP service — never import Python into Node or vice-versa.
2. **AI generation is recruiter-side and pre-computed.** AI (Groq) drafts a test *before* the exam, and it lands in the normal test editor for the recruiter to review/edit/save. **AI must NEVER run during a candidate's live exam** (latency/failure mid-exam + unreviewed questions was an old mistake). An AI-generated test becomes a *normal saved Test*, identical in shape to a hand-made one.
3. **Parse once, match many.** Parsing a resume (file → structured profile) is candidate-intrinsic: do it ONCE and store the result + raw text in Mongo. Matching (profile vs a specific job) runs per-job on demand from the stored text — **never re-parse the file.**
4. **Server-side scoring & answer secrecy.** The candidate's browser never receives `correctIndex`. Test scoring happens on the server. Retake prevention is enforced on submit (the load-time check is only UX).
5. **Business model shapes the code:** candidates are **always free** (they're the supply); **recruiters pay**. The custom ML model is a *margin lever* — routing free-tier parsing to the local model instead of Groq makes the free tier cost ≈ zero. Keep features modular so plan-gating is one `if`. (See `monetization` notes; usage counters are on the backlog.)

## 4. Architecture — three services, HTTP only

```
┌─────────────────┐   HTTP    ┌──────────────────────┐   HTTP    ┌───────────────────────────┐
│  client (React) │ ────────► │  server (Node/Express)│ ────────► │ resume-service (Python)    │
│  Vite :5173     │           │  :5000  + MongoDB     │           │  FastAPI :8000             │
│                 │ ◄──────── │  (gateway + auth + DB)│ ◄──────── │  parse / match / gen-test  │
└─────────────────┘           └──────────────────────┘           └───────────────────────────┘
        the only DB lives behind Node ──┘            Python is STATELESS, no DB, holds the Groq key
```

- **`client/`** — React 19 + Vite + Tailwind v4 + React Router v7. Talks only to the Node server (`src/api.js`).
- **`server/`** — Express 5 + Mongoose 9 + JWT. The **only** thing that touches MongoDB. Acts as the **gateway** to the Python service (it forwards files/text; the browser never calls Python directly in prod). Holds auth.
- **`resume-service/`** — FastAPI on :8000. **Stateless, no database.** Does resume parsing, skill matching, and test generation. **Holds the Groq API key** (Node/React never see it).
- **`model-training/`** — offline R&D (not a running service). Scripts to build a dataset and fine-tune a local resume-parsing model. **Stays on the lead's machine** (models are huge); see §8.

## 5. Repo layout (what's tracked)

```
client/src/
  api.js                 ← every backend call lives here (one place)
  auth.jsx               ← AuthProvider / useAuth, token+email+role in localStorage
  App.jsx                ← routes + role-aware nav; hides recruiter nav on candidate/exam pages
  components/
    TestForm.jsx         ← SHARED by Create + Edit test (reuse — edit both via this)
    ProtectedRoute.jsx
  pages/                 ← Home, Login, Register, CreateTest, EditTest, Results,
                           TakeTest, ResumeUpload, Jobs, MatchResume, BulkMatch,
                           Candidates, Board (public), Apply (public), MyTests (candidate)
server/
  index.js               ← mounts all routers (see API surface below)
  config/db.js           ← Mongo connection
  middleware/
    auth.js              ← requires a recruiter JWT (403s candidate tokens)
    authCandidate.js     ← requires a candidate JWT
  models/                ← User, Test, Result, Job, Candidate, Match, Assignment
  routes/                ← auth, tests, resume, jobs, candidates, board, assignments
  resumeClient.js        ← SHARED client to the Python service (parseFile/matchText/…)
resume-service/
  main.py                ← FastAPI endpoints (thin web layer)
  resume_parser.py       ← parse dispatcher: Groq → local model → regex baseline
  test_generator.py      ← Groq test generation, falls back to question_bank
  local_model.py         ← lazy-loads the fine-tuned model (optional middle tier)
  skills.py / question_bank.py
model-training/           ← dataset + fine-tune scripts (see model-training/README.md, CONTEXT.md)
```

## 6. API surface (current)

**Node `server/` (base `/api`)** — recruiter routes need a JWT; public routes are marked:
- `auth`     — `POST /auth/register`, `POST /auth/login` (returns JWT 7d, email, role, companyName)
- `tests`    — CRUD; `GET /tests/:id` (candidate view, **hides answers**), `GET /tests/:id/edit` (recruiter view, includes answers), `POST /tests/:id/submit` (server scores), `GET /tests/:id/results`
- `resume`   — `POST /resume/analyze`, `POST /resume/generate-test` (forwards file to Python)
- `jobs`     — CRUD + `POST /jobs/:id/match`, `/match-bulk`, `/match-stored`, `GET /jobs/:id/matches`
- `candidates` — talent pool: `POST /candidates/upload` (bulk, upsert-by-email), `GET /`, `DELETE /:id` (cascades), `POST /:id/generate-test`
- `board`    — **PUBLIC, no auth**: `GET /board`, `GET /board/:jobId`, `POST /board/:jobId/apply`
- `assignments` — `GET /assignments` (recruiter), `GET /assignments/mine` (candidate), public `GET /assignments/:id/status`

**Python `resume-service/` (called by Node, never the browser in prod)**:
- `GET /health`
- `POST /parse` (file → structured fields + `resumeText`)
- `POST /match` (file + required_skills) / `POST /match-text` (stored text, no file)
- `POST /generate-test` (file) / `POST /generate-test-text` (stored text)

## 7. Running it locally (the order matters)

Each service is independent. Start all three (separate terminals):

```powershell
# 1. Python resume service  (from resume-service/)
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000   # ONLY ONE uvicorn on :8000

# 2. Node backend           (from server/)
npm run dev      # nodemon index.js → http://localhost:5000

# 3. React frontend         (from client/)
npm run dev      # vite → http://localhost:5173
```

**First-time setup per teammate:**
```powershell
cd client && npm install
cd ..\server && npm install
cd ..\resume-service ; py -m venv .venv ; .\.venv\Scripts\python.exe -m pip install -r requirements.txt
```
Then copy each `.env.example` to `.env` and fill it in (see §9). Each teammate needs their **own** MongoDB (a free MongoDB Atlas cluster or local Mongo) and their **own** Groq API key (free at console.groq.com). Register your own recruiter account in the app — there's no shared login.

## 8. The local ML model & Groq (important for teammates)

- The fine-tuned resume-parsing model and Python `.venv` are **~23 GB and are gitignored** — they stay on the **lead's machine** and are **not** in the repo.
- **Teammates do NOT need the local model.** During development the resume-service uses the **Groq API** (a fast hosted LLM) for parsing and test generation. Just set `GROQ_API_KEY` in `resume-service/.env` and everything works without any model download or GPU.
- The parse pipeline is a 3-tier dispatcher: **Groq → local model → regex baseline.** With a Groq key set, Groq answers; the local model is the lead's private margin lever for production. The frontend shows which tier answered (✨ AI parsed / 🧠 our model / basic parse).
- `model-training/` is the lead's offline R&D track (best model so far ≈ F1 0.63). Teammates can ignore it; details are in `model-training/README.md` and `CONTEXT.md`.

## 9. Environment variables

These are **secrets — never commit `.env` files** (they're gitignored). Copy the `.env.example` templates and fill them in.

**`server/.env`**
| var | purpose |
|-----|---------|
| `PORT` | Node port (default 5000) |
| `MONGO_URI` | your MongoDB connection string |
| `JWT_SECRET` | any long random string — signs login tokens |
| `RESUME_SERVICE_URL` | Python service URL (default `http://localhost:8000`) |

**`resume-service/.env`**
| var | purpose |
|-----|---------|
| `GROQ_API_KEY` | your Groq key — enables AI parse + test generation (free at console.groq.com) |
| `GROQ_MODEL` | optional, default `llama-3.3-70b-versatile` |
| `LOCAL_MODEL_DIR` | optional, path to a fine-tuned model (lead only) |
| `CAPTURE_TRAINING_DATA` | optional, `1` to log Groq outputs for retraining (PII — off by default) |

**`model-training/.env`** (lead only) — `GROQ_API_KEY`, optional `GROQ_MODEL`.

## 10. Current state (phases)

- **Phase 1 — DONE & verified:** no-AI exam spine. Recruiter creates a test → shares link → candidate takes timed test → server scores → recruiter sees results. Includes auth, pass/fail threshold, timer, no-retake.
- **Phase 2 — DONE:** the recruiter-internal AI loop. Parse resume → match vs job → bulk upload → ranked shortlist → generate AI resume-specific test → review → send → candidate takes → lie-detector view (match % vs test %).
- **Phase 3 — in progress:** candidate accounts, public job board + self-apply, test assignments ("My tests"), and "My applications". **Verified live (2026-06-16):** register candidate → board → self-apply → "My applications" (email-bridged, shows match %) → "My tests" empty state → logged-out route guard → public-apply rate-limit (429). Still deferred: usage counters and browser-based proctoring (its own slice, later).

## 11. Conventions & gotchas

- **All backend calls go through `client/src/api.js`** — don't scatter `fetch` calls across components.
- **`TestForm.jsx` is shared** by Create and Edit — change test-form behavior in one place.
- Candidate-facing pages (`/take/:id`, `/board`, `/apply/:id`) deliberately **hide the recruiter nav**.
- A candidate's role is carried **inside the signed JWT**, not just localStorage — so it can't be self-promoted.
- **Don't edit `dataset.jsonl` with PowerShell** `Set-Content -Encoding utf8` — it writes a BOM that breaks Python's `json.loads`. Edit via Python.
- Files over 100 MB break GitHub — never commit models, `.venv`, `node_modules`, or `*.pt`/`*.dll` (all gitignored). `study/` (personal notes) is also gitignored.
- **The backend no longer dies if Mongo is unreachable at startup.** `config/db.js` retries with backoff instead of `process.exit(1)` (which, under nodemon, left the server permanently dead — this killed a demo once). The web server keeps listening; DB-dependent routes return a clear `503` until connected, then recover on their own. `/api/health` never touches the DB.
- **Before any live demo (checklist):** (1) Atlas → Network Access → allowlist `0.0.0.0/0` so a venue's WiFi/new-IP can't lock you out (the #1 cause of "backend won't start" away from home). (2) Start the 3 services in order (§7) and hit `http://localhost:5000/api/health` — `ok` means the server is up; if `/api/board` returns `503`, the DB just isn't connected yet (check internet/allowlist), the server itself is fine.

---

*If something here is out of date, fix it in this file as part of your change — keep the shared brain accurate.*
