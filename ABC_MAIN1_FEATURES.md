# ABC--main1 — Complete Feature Inventory

> **What this is:** An exhaustive listing of *every* feature in the `ABC--main1` project (the
> folder `ABC--main1\ABC--main`), down to the smallest things — every API endpoint, page, button,
> detection rule, and helper script. Built by reading the actual code, not the docs.
>
> **What ABC--main1 is:** An early, fairly complete version of the **TalentLeague** idea — an
> AI hiring/assessment platform. It has **three deliverables**: a Node/Express backend, a
> React+TypeScript web app, and a Capacitor **Android mobile app**, plus a browser-based
> **proctoring/anti-cheat** engine.
>
> ⚠️ **Reality vs. docs:** Several features are documented or advertised but are actually stubs,
> unused, or out of sync with the code. These are flagged inline with ⚠️ so we know what *really*
> works before borrowing from here.

---

## 0. Tech Stack (as actually used)

| Part | Stack |
|---|---|
| **Backend** | Node.js + Express 5, MongoDB (Mongoose 9), JWT (jsonwebtoken), bcryptjs, multer, nodemailer, pdf-parse, axios, google-auth-library, groq-sdk |
| **Web frontend** | React 18 + TypeScript + Vite + React Router v6 + Tailwind (glassmorphism) + lucide-react + axios |
| **AI providers** | Groq (`llama-3.3-70b-versatile`), Google Gemini (`gemini-2.5-flash`), Ollama (`llama3`, local) — each with a hardcoded fallback |
| **Proctoring CV** | MediaPipe FaceMesh + Tasks-Vision (HandLandmarker) + Camera Utils, TensorFlow.js + COCO-SSD (object detection) |
| **Mobile** | Capacitor 5 wrapping a Create-React-App SPA, Android only |

---

# PART A — BACKEND (`backend/`)

Express server on port **5000**. Resilient by design: works with **no DB** (JSON file fallback),
**no email config** (Ethereal preview / writes to `out.txt`), and **no AI keys** (hardcoded
question banks / regex resume parser).

## A1. Server core (`server.js`, `config/db.js`)
- Boots Express, connects MongoDB (`MONGODB_URI` or `mongodb://localhost:27017/exam_portal`); **stays
  up in offline mode if DB is down** (`readyState` is checked everywhere to switch online/offline).
- Permissive CORS (⚠️ effectively allows **all** origins — "allow all for now to debug").
- `express.json`/`urlencoded` at 10 MB. Serves `public/` statically. Logs every request.
- Mounts routers: `/api/exams`, `/api/auth`, `/api/resume`, `/api/proctoring`, `/api/mcq`.
- **Non-router endpoints:**
  - `GET /` → "Exam Portal API is running..."
  - `GET /open-app/:token` → serves `public/app-redirect.html` (the "Open in App" deep-link launcher)
  - `GET /test` → diagnostics: reports whether Groq/Gemini keys are present, CORS origin
  - `GET /diagnostic` → mobile diagnostics: backend/frontend URL, timestamp, origin, user-agent

## A2. Authentication — email/password + offline (`authController.js`, `/api/auth`)
- `POST /api/auth/register` — `{name,email,password,role}` → creates user, returns `{_id,name,email,role,token,mode}`.
- `POST /api/auth/login` — `{email,password}` → bcrypt-compare → JWT.
- `POST /api/auth/google/verify` — `{token}` (Google ID token) → verifies, finds/creates user + Identity record.
- **JWT:** signs `{id}`, 30-day expiry. ⚠️ Falls back to hardcoded secret `'fallback_secret'` if `JWT_SECRET` unset.
- **Offline mode:** when DB is down, reads/writes users in `data/users.json` (bcrypt still applied). Response says `mode: 'offline'`.

## A3. Multi-provider OAuth + developer sandbox (`authOAuthController.js`, `/api/auth/oauth`)
- Providers configured: **google, github, linkedin, microsoft** (auth/token/userinfo URLs + scopes).
- `GET /api/auth/oauth/:provider/start` — builds state (base64 of role/returnUrl/provider), 302 to provider.
- `GET /api/auth/oauth/:provider/callback` — exchanges code→token, fetches profile, find/create User + upsert Identity, redirects to frontend `/oauth/callback?token=&role=&name=`.
- **Sandbox login** (⚠️ the clever fallback): if provider keys are missing, `/start` redirects to a built-in mock HTML login page (`/oauth/sandbox/login`) with "Sign in as Candidate / Recruiter" buttons; `/sandbox/complete` synthesizes a `MOCK_` code so the rest of the flow works **with zero real OAuth setup**. Avatars via ui-avatars.com.
- Per-provider profile normalization (incl. GitHub's extra email fetch). Stores tokens in the `Identity` subdoc (⚠️ unencrypted).

## A4. Resume upload + AI parsing (`resumeController.js`, `/api/resume`)
- `POST /api/resume/analyze` — multipart field `resume` (PDF/Word, **50 MB** limit).
- **Pipeline:** pdf-parse text extract → reject if <50 chars (scanned image) → **Groq** parse (temp 0.1, computes a 0–1 confidence) → **Gemini** parse only if Groq failed or confidence <0.7 (then merges results/skills) → **local regex fallback** if both fail (extracts email/phone/linkedin/github, matches ~23 known skills) → generates simple text "assessment questions".
- **Project rating engine** (`calculateProjectRating`): keyword scoring (full-stack, tech count, auth, deployment, impact %, testing, docs) capped at 10, labeled Low/Medium/High.
- **Output:** name, email, phone, location, linkedin, github, summary, skills[], experiences[], internships[], projects[], achievements[], education[], assessmentQuestions[], aiConfidence, aiSource, parsedAt. ⚠️ Result is returned to client only — **not persisted to DB**.

## A5. Exams — question bank + AI generation + results (`examController.js`, `/api/exams`)
- `GET /api/exams/questions` — all `Question` docs.
- `POST /api/exams/submit` — `{candidateName,score,totalQuestions,answers,violations}` → saves a `Result`.
- `POST /api/exams/seed` — wipes + inserts 3 hardcoded React MCQs.
- `POST /api/exams/generate` — `{analysisData}` → **Ollama** (`llama3`, local) generates 15 hard MCQs (40% project / 40% skill / 20% logic), **deletes all existing Questions and replaces them**.
- `POST /api/exams/generate-phase2` — `{resumeData}` → **Groq** generates 8 written-answer (syntax/logic/coding) questions; falls back to 6 hardcoded templated questions seeded from the candidate's skills/projects. Returned, not stored.

## A6. MCQ test lifecycle — the core flow (`mcqController.js`, `/api/mcq`)
- `POST /api/mcq/create` — `{candidateEmail,candidateName,skills[]}` → generates 10 AI MCQs from skills (Groq, hardcoded-bank fallback), creates `MCQTest` with a `crypto.randomBytes(32)` token, **emails the candidate a test link**, returns `{testId,testLink,emailSent,previewUrl}`.
- `GET /api/mcq/all?email=` — list tests (omits correct answers), optional email filter. (Recruiter tracking.)
- `GET /api/mcq/verify/:token` — validate a link → `{candidateName,duration,totalQuestions}` (404 if completed/expired).
- `GET /api/mcq/questions/:token` — fetch questions (no correct answers), marks test `started`.
- `POST /api/mcq/submit/:token` — `{answers[],violations[]}` → scores (round(correct/total*100)), marks `completed`, sets `testPhase=2`.
- `GET /api/mcq/result/:token` — score/status/violations.
- **Email** (`sendTestEmail`, nodemailer): Gmail if `EMAIL_USER/PASS` set, else auto-creates an **Ethereal test inbox** and returns a preview URL. On failure it **writes the full email to `out.txt`** and never hard-fails the flow. Dark-themed branded email with "Continue to App" (deep link) + "Continue in Browser" buttons.
- **Deep-link generation:** builds `${backendUrl}/open-app/:token?token=...&fallback=<browser link>`. Needs `BACKEND_URL`+`FRONTEND_URL` (read fresh from `.env` each call — see A8).

## A7. Proctoring storage (`proctoringController.js`, `/api/proctoring`)
- `POST /api/proctoring/sessions` — create session. `GET /sessions/:id` — fetch.
- `POST /sessions/:id/risk` — update `{currentRiskScore,status}`.
- `POST /violations` — store a violation. `POST /risk-events` — store a weighted risk event.
- `POST /heartbeat` — `{sessionId}` → `{ok,status}`.
- ⚠️ Server only **stores** what the client sends; it does no scoring itself. (And in practice the web client only ever calls `POST /sessions` — see Part C.)

## A8. Utilities & helper scripts
- `utils/offlineStore.js` — JSON user store (`data/users.json`); auto-creates dir/file; `findUserByEmail`, `addUser` (`_id = offline_<ts>`).
- `utils/runtimeConfig.js` — reads `BACKEND_URL`/`FRONTEND_URL` **fresh from the `.env` file on every call** (so Cloudflare tunnel URLs can change without restarting the server). Used by email links, OAuth redirects, `/diagnostic`.
- `claude-bridge.js` — ⚠️ separate Express app on port 8080; `POST /api/chat` always returns **503** (non-functional stub).
- `cleanup-users.js` — deletes test users (⚠️ connects to a *different* DB name `resume-ai`).
- `see-users.js` — prints all users as a table. `test-db.js` — DB connectivity check. `test-send-mcq.js` — posts a sample candidate to `/api/mcq/create`.

## A9. Database models (Mongoose) — every field
- **User**: name, email (unique, regex, lowercase), password (select:false, min 6, required unless `isSocialOnly`), role (candidate/recruiter/admin), avatar, title, company, location, isSocialOnly, emailVerified, createdAt; bcrypt `pre('save')` + `matchPassword`; virtual `identities`.
- **Identity**: userId(ref), provider (google/microsoft/github/linkedin), providerUserId, emailFromProvider, emailVerifiedByProvider, scopesGranted[], tokens{accessToken,refreshToken,expiresAt}, profileSnapshot{name,avatar,raw}, lastSyncAt; unique index `{provider,providerUserId}`.
- **MCQTest**: candidateEmail, candidateName, testLink(unique), testToken(unique), questions[{question,options[],correctAnswer,skill,difficulty}], duration(30), status(pending/sent/started/completed/expired), sentAt, startedAt, completedAt, score, totalQuestions, correctAnswers, proctoringViolations[], cameraSnapshots[], testPhase(1).
- **Question**: question, options[], type(mcq/coding/logic/syntax), correctAnswer, skill, difficulty(basic/intermediate/advanced).
- **Result**: candidateName, score, totalQuestions, answers(Map), violations[{type,timestamp,severity,description}], timestamp.
- **ProctoringSession**: sessionId(unique), userId, createdAt, status(active/warning/suspended/terminated/completed), baselineRiskScore, currentRiskScore, referenceImagesEncrypted, signedToken.
- **Violation**: sessionId, type, severity(low/medium/high), description, timestamp.
- **RiskEvent**: sessionId, signalSource, weight, scoreDelta, timestamp.

---

# PART B — WEB FRONTEND (`frontend/`)

React + TS + Vite. Auth state + most app state lives in **localStorage**. Two layouts:
`CandidateLayout` (sidebar: Dashboard/Resume/Assessments/Results/Jobs/Profile/Notifications) and
`RecruiterLayout` (Dashboard/Assessments/Candidates/Jobs/Settings). Route guards:
`CandidateRoute`, `RecruiterRoute`, `ProtectedRoute`.

## B1. Auth & bootstrap
- `AuthContext` — holds `user` + `viewRole` (both persisted to localStorage). `login`/`signup` POST directly to `localhost:5000/api/auth/*`.
- `lib/api/client.ts` — axios instance (baseURL `:5000/api`, attaches Bearer token, on 401 logs out → `/login`). ⚠️ Most pages use bare `axios`/`fetch` instead of this client.
- `ErrorBoundary` wraps the app; `GoogleOAuthProvider` (hardcoded client ID).

## B2. Public / auth pages
- **Login** (`/login`) — email+password, candidate/recruiter **role toggle**, show/hide password, remember-me, Google login (`<GoogleLogin>` → `/api/auth/google/verify`), LinkedIn (redirect to OAuth start). ⚠️ forgot-password is a dead link; errors use `alert()`.
- **Signup** (`/signup`) — name/email/password/confirm + role toggle (prefilled from `?role=`), terms checkbox.
- **OAuthCallback** (`/oauth/callback`) — reads token/role/name from query, stores user, redirects by role after 1.5s.

## B3. Candidate flow — functional pages
- **Dashboard** (`/dashboard`) — welcome card, stat cards (⚠️ hardcoded zeros), 4 Quick-Action nav buttons, empty Recent Activity.
- **ResumeUpload** (`/resume-upload`) — **the AI resume scanner.** Drag-&-drop / picker (PDF only) → `POST /api/resume/analyze` → renders parsed sections: confidence banner, summary, personal info, internships (⭐/10 rating), experience, AI-extracted skills (proficiency + Verified/Claimed/Inferred + confidence bar), projects (rating/complexity/impact/tech), AI-generated assessment questions, achievements, education. Saves `parsedResumeData` to localStorage. CTA → Candidate Verification.
- **Assessments** (`/assessments`) — 6 hardcoded assessment jobs. **Start flow:** requires resume (else modal → upload) → runs an **AI skill-match analysis modal** (match %, matched/missing skills, gate ≥50% to proceed) → routes to verification or `/take-exam`.
- **ExamResults** (`/exam-results`) — huge results dashboard from localStorage `examResults`: league tier (Apex/Diamond/Platinum/…), ability score, per-skill proficiency, difficulty-adjusted section scores, time analysis, integrity metrics, job-requirement benchmark, percentile, verified-vs-claimed skills, strongest/weakest/missing/trainable skills, "Resume vs Reality". ⚠️ Export/Share buttons not wired; much of it is sample data.
- **Jobs** (`/jobs`) — 6 hardcoded jobs, live search filter, stat cards, randomized "AI Match Score", Apply (⚠️ not wired).

## B4. Candidate flow — placeholder / stub pages
- ⚠️ **League** (`/league`) & **Salary** (`/salary`) — "Coming Soon" preview cards only.
- ⚠️ **Profile, Notifications, MissionControl, JDIntelligence, ResumeIntelligence, AntiCheatingMonitor, Analytics, SkillMatching** — bare "Coming soon..." stubs (most reachable only by direct URL, not in the sidebar).

## B5. Exam / proctoring flow (candidate, no layout)
- **CandidateVerification** (`/candidate-verification`) — **identity verification + liveness.** MediaPipe FaceMesh + FaceDetector; captures **3-angle reference photos** (front/left/right), runs liveness (2 blinks), **AES-GCM encrypts** the photos, creates + saves a proctoring session, `POST /api/proctoring/sessions`, → proctoring rules.
- **ProctoringRules** (`/proctoring-rules`) — pre-exam rules screen; **Start Test** posts `/api/mcq/create` and stores `activeMcqToken`.
- **MonitoringCamera** (`/monitoring-camera`) — Phase-1 live monitor (FaceMesh + COCO-SSD): face count, gaze, posture, phone/object detection, fullscreen + tab-switch warnings, violation records; fetches `/api/mcq/result/:token`; → Phase 2.
- **MCQTest** (`/mcq-test/:token`) — **public tokenized Phase-1 exam.** Verify → load questions → webcam proctoring → timer + question nav + answer select → `POST /api/mcq/submit/:token` → score.
- **TakeExam** (`/take-exam` proctored, `/test-exam` unproctored) — full adaptive proctored exam: FaceLandmarker + FaceMesh + AudioContext (voice anomaly), head-pose, blink, position lock, frame-diff; violations/warnings/tab-switch/look-away timers, termination + auto-submit; 30-min timer, question-review grid, flagging, confirm-submit. Uses `/api/exams/questions` + `/submit`.
- **TestPhase2** (`/test-phase-2`) — Phase-1→2 transition; shows Phase-1 summary, proceeds to coding test.
- **Phase2CodingTest** (`/phase-2-exam`) — AI coding exam: `POST /api/exams/generate-phase2` (resume-tailored questions), code editor per question, 45-min timer, renders `Phase2ProctorWidget` sidebar.
- **TestEnterpriseFace** (`/test-enterprise-face`) — dev harness rendering `EnterpriseFaceEngine`.

## B6. Recruiter pages (all functional)
- **RecruiterDashboard** (`/recruiter/dashboard`) — stat cards (⚠️ hardcoded) + 4 Quick-Action nav buttons.
- **Candidates** (`/recruiter/add-candidate`) — add candidate (name/email/skills) → `POST /api/mcq/create` (sends test); handles email-sent / preview / clipboard-copy fallback; Copy-Link button.
- **RecruiterAssessmentsAdd** (`/recruiter/assessments/add`) — **bulk test sender:** editable multi-row table, Send All loops `/api/mcq/create`, activity log.
- **RecruiterCandidateDetails** (`/recruiter/candidates`) — **test tracking dashboard:** `GET /api/mcq/all` (+ email filter + refresh), table of candidates with status/score/dates.
- **RecruiterJobs** (`/recruiter/jobs`) — job management (⚠️ local mock state): search, type filter, create-job modal, status badges, edit/delete.
- **RecruiterSettings** (`/recruiter/settings`) — tabbed (Profile/Notifications/Privacy/Security/Appearance); ⚠️ Save simulates a 1s async (no real API).
- **AssessmentManagement** (`/recruiter/assessment-management`) — assessment templates + skills + question-bank manager (⚠️ all mock): tabs, search, skill/difficulty filters, create modal, edit/copy/delete.

## B7. ⚠️ Unused / legacy frontend assets
`Navbar.tsx`, `OAuthButtons.tsx`, `data/mockData.ts`, and most of `types/index.ts` are not wired into the live app.

---

# PART C — PROCTORING / ANTI-CHEAT ENGINE

⚠️ **Big caveat:** `PROCTORING_ARCHITECTURE.md` describes far more than the code implements. The
real, working anti-cheat lives in **two React components**, each self-contained. There is **no
shared risk engine** wiring them together, and several documented files don't exist.

## C1. What actually works
- **`Phase2ProctorWidget.tsx`** (used in the Phase-2 coding test) — the primary live widget. Webcam 640×480 + MediaPipe FaceMesh (`maxNumFaces:3`) + COCO-SSD (object detection throttled to 1.4s). Detects:
  - **No face** → "Face not visible" (high)
  - **Multiple faces** → "Multiple faces detected" (high)
  - **Eyes closed** via Eye-Aspect-Ratio (avg EAR < 0.16) → "Eyes closed" (medium)
  - **Gaze / look-away** via yaw/pitch ratios (yaw |>0.1|, pitch <−0.08 or >0.2) → "Looking left/right/up/down" (medium)
  - **Posture** (roll angle, slouching nose.y>0.68, leaning) → "Posture issue" (low)
  - **Mobile/phone** (COCO-SSD "cell phone" score ≥0.45) → "Mobile device detected" (high)
  - **Tab switch** (`visibilitychange`) → "Tab switching detected" (high) + kills camera
  - Window blur / pagehide → stops camera
  - Violations: 5s per-type debounce, keeps last 5; aggregate `suspiciousLevel` = clear/medium/high/camera-error. ⚠️ **Persisted to `localStorage['phase2ProctoringSummary']` only — never sent to backend.**
- **`EnterpriseFaceEngine.tsx`** (used in CandidateVerification / test harness) — identity-capture + environment QA. FaceMesh + HandLandmarker. Flags (no severity): Low Light, Overexposed, Blurry (Laplacian), Shadow, Glare, No Face, Multiple Faces, Too Far/Close, Fast Movement, Looking Away, Hand Detected. **Auto-captures front/left/right** photos when stable & in head-pose range; per-angle Retake. No scoring, no backend.
- **Session crypto** (`session.ts`) — reference photos encrypted with **AES-GCM 256**, key via **PBKDF2 (SHA-256, 100k iterations)**. ⚠️ The "signed token" is *not* real crypto — just base64 (trivially forgeable).
- **Risk thresholds** defined in `types.ts` (NORMAL≤30, SOFT≤60, HARD≤80, TERMINATED 100). ⚠️ But `currentRiskScore` is never actually computed/mutated — the live components use their own ad-hoc `suspiciousLevel`/`anomalies` instead.

## C2. ⚠️ Documented-but-missing / dead
- `face-api.js` + the bundled models in `public/models/` (tiny_face_detector, face_landmark_68, ssd_mobilenetv1) are a **dead dependency** — never imported. All CV uses MediaPipe from CDN.
- `clientMonitor.ts` (fullscreen lock, copy/paste/right-click/DevTools block) and `networkSecurity.ts` (Geo-IP / IP-change risk) **don't exist**.
- `realtimeEngine.ts` and `riskEngine.ts` are **stubs** returning placeholder objects; no intervals, no WebSocket.
- `api.ts` defines `recordViolation`, `recordRiskEvent`, `heartbeat` — but **only `POST /sessions` is ever called**; the rest have no caller. The "15s heartbeat" is never scheduled.
- `ProctoringWrapper.tsx` is a no-op layout `div` (contains no proctoring logic despite the doc).

---

# PART D — MOBILE APP (`mobile-app/`)

Capacitor 5 + React (CRA) Android app, id `com.talentleague.app`. **Tab-state navigation** (not
react-router): `App.tsx` holds `activeTab`, `BottomNav` switches Home/Jobs/Test/Profile.

## D1. Screens
- ⚠️ **Home / Jobs / Profile** — fully static mock data. Jobs search/filter, Profile resume-upload & settings buttons are **non-functional stubs** (README advertises them as working).
- **Test** (`TestPage.tsx`) — **the only feature-complete, backend-connected screen.** Two modes:
  - *Default:* static assessment catalog (4 mock tests).
  - *Live MCQ mode* (when a `mcqToken` arrives from a deep link): `GET /api/mcq/verify/:token` → intro screen → `GET /api/mcq/questions/:token` → timed exam (auto-submit on timeout, A/B/C/D options, prev/next, answered count) → `POST /api/mcq/submit/:token` → score → hands off to web **Phase 2** page `{frontend}/test-phase-2?token=&backend=`.

## D2. Deep linking (the core integration)
- **URL schemes** (AndroidManifest intent filters): custom `talentleague://test/{token}` (primary), plus `talentleague://exam` & `://dashboard` (⚠️ filters exist but no in-app handler), and http/https App Links (⚠️ hardcoded dev IP `192.168.1.16:5173` + `talentleague.app` placeholder).
- **Handling** (`App.tsx` via `@capacitor/app`): `getLaunchUrl()` for cold start + `appUrlOpen` listener for warm. `handleDeepLink` regex-extracts the token (must be >10 chars) and reads `?backend=`/`?frontend=` query params, then switches to the Test tab in live mode.
- **End-to-end:** backend email contains 3 link variants (custom scheme, Android `intent://` with `browser_fallback_url`, web fallback) → click opens app → loads test against the backend tunnel.
- **Phase-2 hand-off** (`openExternalPhase2Page`): uses `Capacitor.isNativePlatform()`; on Android does a 3-attempt escalating external-browser open (anchor click → window.open → location.href) to beat WebView quirks.
- **Capacitor config:** `androidScheme:'http'` + `cleartext:true` (allows plain HTTP for LAN/tunnel).
- **Plugins:** `@capacitor/core` (platform check), `@capacitor/app` (deep links), `@capacitor/android`, `@capacitor/cli`. (No camera/filesystem/push.)

## D3. Deep-link tooling & docs
- `test-deeplink.html` — interactive deep-link tester (3 buttons, did-the-app-open fallback alert).
- `setup-deeplink.bat`/`.sh` — install Capacitor pkgs → build → `cap sync android` → print next steps.
- `scripts/start-deep-link-test.ps1` — prints current Cloudflare tunnel URLs and updates `backend/.env`.
- Docs: `DEEP_LINKING_SETUP.md`, `DEEP_LINK_FIX_SUMMARY.md`, `DEEP_LINK_TUNNEL_TESTING.md` (two-tunnel Cloudflare workflow; ⚠️ must regenerate the email every time tunnels restart).
- ⚠️ `MCQTest.tsx.backup` — legacy unused earlier test page (used react-router + hardcoded `:5000`).

---

# PART E — Root-level test artifacts
HTML/JS smoke-test files at the project root: `frontend-test.html`, `test-mcq-api.html`,
`test-email-button.html`, `test-register.html`, `test-backend.js`, `test-final-recruiter.js`,
`test-signup-fixed.js`, `test-send-mcq.js`, plus root `cleanup-users.js`.

---

# SUMMARY — what really works vs. what's a shell

**✅ Genuinely working & worth borrowing:**
- Full MCQ test lifecycle (create → email link → take → score → results) — backend + web + mobile.
- AI resume parsing with 3-tier fallback (Groq → Gemini → local regex).
- AI MCQ/Phase-2 question generation (Groq/Ollama) with hardcoded fallbacks.
- Multi-provider OAuth **with a sandbox mode** that needs no real keys.
- Offline-resilient backend (JSON store, Ethereal email, AI fallbacks).
- Browser proctoring: face/multi-face/eyes/gaze/posture/phone/tab-switch detection + AES-GCM photo encryption.
- Mobile deep-linking (email → app → live MCQ test → web Phase 2).

**⚠️ Stubs / advertised-but-not-real (do NOT assume these work):**
- Web: League, Salary, Profile, Notifications, Analytics, SkillMatching, MissionControl, JDIntelligence, ResumeIntelligence, AntiCheatingMonitor (all "coming soon"/stubs).
- Proctoring: the "weighted risk engine", heartbeat, fullscreen lock, copy/paste block, Geo-IP, WebSocket realtime — **none implemented**; risk score never computed; `face-api.js` dead.
- Mobile: Home/Jobs/Profile screens and their search/filter/upload/settings buttons are mock.
- `claude-bridge.js` always 503.

**🔒 Security notes (relevant if we reuse code):** CORS allows all origins; JWT fallback secret hardcoded; Google client ID hardcoded; OAuth token passed via URL query; provider tokens stored unencrypted; proctoring "signed token" is forgeable base64.
