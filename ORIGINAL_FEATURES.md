# original — Complete Feature Inventory

> **What this is:** An exhaustive listing of *every* feature in the `original` project — down to the
> smallest things. Built by reading the actual code, not the docs.
>
> **What `original` is:** The **richest and most ambitious** version of the **TalentLeague** idea
> (AI remote hiring + assessment with multi-layer anti-cheat proctoring). It is essentially a
> **superset of `ABC--main1`** plus a whole suite of R&D modules that ABC--main1 never had:
> a **trained Python ML resume parser**, a **WiFi-sensing presence detector**, a **BLE-detection
> Android app**, **pose-sensing**, **session-binding (face+device identity lock)**, and **three
> packagings of a unified anti-cheat engine**.
>
> ⚠️ **Reality vs. docs:** As before, a lot is documented/pitched but is actually a stub, dead code,
> or an experimental run that doesn't really work. These are flagged with ⚠️ throughout.
>
> 🔗 **Overlap with ABC--main1:** The `ABC--main` web/backend here is a *later, expanded* version of
> the one documented in `ABC_MAIN1_FEATURES.md`. Rather than repeat the shared base, Part A below
> focuses on **what's new/changed**; for the unchanged base (resume parsing, MCQ flow, OAuth sandbox,
> models, proctoring widgets) see `ABC_MAIN1_FEATURES.md`.

---

## 0. Top-level structure

| Folder | What it is |
|---|---|
| `ABC--main/` | Web app — Node/Express backend + React+TS+Vite frontend (**expanded** vs ABC--main1) |
| `ABC-mobile-app/` | Capacitor Android mobile app (**now with real login/signup**) |
| `resume-parser/` | **Python ML** — a fine-tuned BERT token-classifier (NER) for resume fields |
| `wifi-sensing/` | **Python** — WiFi-RSSI + ultrasonic human-presence detection (anti-cheat sensor) |
| `ble-detection/` | **Angular + Ionic + Capacitor** Android app — scans nearby Bluetooth devices |
| `pose-sensing/` | **Vanilla TS + Vite** — MediaPipe Pose + COCO-SSD body/behaviour detector (the ancestor of all pose logic) |
| `session-binding/` | **TS module** — face-embedding + BLE device fingerprint to lock identity across a session |
| `anti-cheating-monitor/` | **React + Vite** operator dashboard that runs the anti-cheat engine live |
| `anticheat-bundle/` | Copy-paste service bundle (8 detection layers) + the Python WiFi backend |
| `anticheat-plugin/` | The bundle repackaged as an **npm package** (`@yourorg/anticheat-plugin`) — most reusable |
| `ANTICHEAT_INTEGRATION_PLAN.md`, `PRESENTATION_GUIDE.md` | Root planning + pitch docs |

---

# PART A — WEB APP `ABC--main` (what's NEW vs ABC--main1)

Rebranded **"TalentLeague"**. Same stack (Express :5000 + React 19/TS/Vite/Tailwind 4). The two
big themes: **(1) a real recruiter CRUD suite**, and **(2) the security/authorization overhaul was
actually implemented**.

## A1. Backend — new authorization layer (the big change)
- **NEW `middleware/auth.js`** (didn't exist in ABC--main1):
  - `protect` — verifies JWT, loads user (DB or offline store), attaches `req.user`.
  - `authorize(...roles)` — 403 if the user's role isn't allowed.
  - `requireVerified` — 403 for recruiters whose company isn't verified (`companyVerified !== true` / `verificationStatus !== 'verified'`); admins bypass.
- **CORS is now origin-checked** (localhost/127/`.vercel.app`/capacitor/ionic + `FRONTEND_URL`) — the old "allow all" hole is fixed. `/test` & `/diagnostic` debug routes gated behind `NODE_ENV !== 'production'`.

## A2. Backend — new recruiter features (3 new route groups)
- `/api/jobs` (`jobController`, `Job` model) — recruiter job CRUD; `recruiterId = req.user._id` enforced, ownership checks on update/delete, offline JSON fallback. `Job`: title, dept, location, type, experience, salary{min,max,currency}, requirements, status, recruiterId, applicants.
- `/api/interviews` (`interviewController`, `Interview` model) — schedule interviews; **emails the candidate an HTML invite** on creation; offline fallback. `Interview`: jobTitle, candidateEmail, date, time, type(video/phone/in-person), status(upcoming/completed/cancelled), round, recruiterId.
- `/api/assessment-templates` (`assessmentTemplateController`, `AssessmentTemplate` model) — `AssessmentTemplate`: name, role, type(scratch/clone/ai-generated), skills, rounds, minScore, status, recruiterId.

## A3. Backend — changed auth & user model
- **`User` model** gained recruiter-verification fields: `companyName`, `gstNumber`, `cinNumber`, `udyamNumber` (all regex-validated), `companyVerified`, `verificationStatus`(not_required/pending/verified/rejected), `verificationNote`, `verifiedAt`, `verifiedBy`. (Validated regexes: GST `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`, CIN `^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$`, UDYAM `^UDYAM-[A-Z]{2}-\d{2}-\d{7}$`.)
- **New auth endpoints:** `POST /register-recruiter`, `GET /me` (protected), `POST /verify-company` (admin only). Plus OTP register/verify/resend + forgot/reset password flows (new vs ABC--main1). Google verify + multi-provider OAuth sandbox retained.
- **`mcqRoutes` split** into recruiter-only JWT-gated (`/stats`, `/create`, `/all`) vs token-based candidate routes. New `getRecruiterStats`, `listMCQTests`. ⚠️ MCQ submit is still token-based (not JWT) — deliberate for emailed links, but the token-replay risk the audit flagged technically remains.

## A4. Frontend — new functional recruiter pages
RecruiterDashboard, RecruiterJobs, RecruiterInterviews, RecruiterAssessmentsAdd, RecruiterCandidateDetails, RecruiterSettings, **RecruiterSignup**, **RecruiterVerificationPending**, **CompanyApprovals**, AssessmentManagement, AssessmentResultsDetailed, AssessmentResumeUpload, JobApplicationResumeUpload — all wired to the new `/api/jobs`, `/api/interviews`, `/api/assessment-templates`, `/api/mcq` endpoints. New auth/flow pages: OAuthCallback, ForgotPassword, ResetPassword, VerifyEmail. New components: ThemeToggle, Toast (replacing some `alert()`s), plus the existing CandidateLayout/RecruiterLayout/proctoring widgets.
- ⚠️ **Still stubs** (the 7 the audit flagged): Analytics, JDIntelligence, MissionControl, SkillMatching, ResumeIntelligence, Notifications are 10-line "Coming soon"; Salary/League are static mockups.

## A5. The two audit docs (what they tell us)
- **`PROJECT_AUDIT.md`** (2026-04-02): 2 critical / 6 high / 15 medium / 6 low. ⚠️ **CRITICAL — real secrets committed in `backend/.env`** (Mongo URI, Groq, Gemini, Gmail, Google+LinkedIn OAuth) → must rotate + gitignore. CORS-allow-all (now fixed). HIGH: public MCQ submit (still token-only), OAuth `returnUrl` open-redirect, 7 stub pages, zero test coverage (still true). "Working well": clean route/controller/model separation, JWT + role middleware, GST/CIN recruiter flow, dark/light theme, offline JSON fallback.
- **`SECURITY_FIX_PLAN.md`**: root cause was *no backend authorization* (a candidate could flip `viewRole` in localStorage and hit recruiter APIs). **Most of the 14-step plan shipped** — auth middleware, route guarding, ownership checks, company-verification fields/endpoints, RecruiterSignup/VerificationPending. ⚠️ Not done: GST auto-verification API, admin verification panel UI, audit-logging middleware.

---

# PART B — MOBILE APP `ABC-mobile-app` (now with login)

Package `talentleague-mobile` (CRA + React 18 + Capacitor 5 Android, id `com.talentleague.app`,
scheme `talentleague://`).

- **NEW: real auth flow** (ABC--main1's mobile had none). `context/AuthContext.tsx`: `login(email,password,role)` → `POST /api/auth/login`; `signup(...)` → `/api/auth/register`; persists JWT + user to localStorage (`tl_user`/`tl_token`). Backend URL defaults to `http://192.168.1.16:5000`, overridable via `tl_backend_url`.
- **NEW `LoginPage.tsx`** — gradient UI, candidate/recruiter role picker, show/hide password (⚠️ "Forgot?" not wired). **NEW `SignupPage.tsx`** — live password-strength meter (8+/upper/lower/number/special), role picker.
- **App gating:** unauthenticated → Login/Signup only; authenticated → tab nav renders.
- Tab nav (Home/Jobs/Test/Profile) unchanged. ⚠️ Home/Jobs/Profile still hardcoded mock; **only TestPage** is backend-connected (deep-linked MCQ test → external Phase-2 hand-off), same as ABC--main1. ⚠️ `MCQTest.*.backup` dead files remain.

---

# PART C — PYTHON ML RESUME PARSER (`resume-parser`)

A **fine-tuned BERT token-classifier (NER)** that tags every word in a resume with a field type,
then groups tags into extracted fields. ⚠️ **CLI/script only — no API/server.**

## C1. The model
- **`BertForTokenClassification`** — full **BERT-base** (`bert-base-uncased`, 768 hidden, 12 layers, ~110M params), **27 labels** (BIO).
- **Label scheme** (B-/I- pairs): NAME, EMAIL, PHONE, ADDRESS, SKILL, DEGREE, UNIVERSITY, JOBTITLE, COMPANY, DATE, CERTIFICATION, PROJECT, LANGUAGE (+ `O`).

## C2. Pipeline
- **`download_data.py`** — pulls a resume-NER dataset from HuggingFace (`yashpwr/resume-ner-training-data` / `Mehyaar/Annotated_NER_PDF_Resumes`), normalizes labels through a big `LABEL_MAP`, writes `sample_data.json`. `--limit N` (default 50).
- **`sample_data.py`** — fallback: 5 hardcoded English example resumes.
- **`extract_text.py`** — PDF via `pdfplumber`, DOCX via `python-docx`, TXT plain. (Used for inference text, not wired into training.)
- **`train.py`** — HF `Trainer`, subword label alignment (`-100` for continuations), **10 epochs, batch 16, lr 5e-5, weight_decay 0.01, warmup 0.1**, 80/20 split, seqeval F1, saves to `trained-model/`.
- **`predict.py`** — CLI `python predict.py resume.pdf` (or `--text`, `--json`); whitespace-splits text, runs token classification, groups B-/I- tags into a `{field: [values]}` dict.
- **Deps:** transformers, datasets, torch, accelerate, seqeval, pdfplumber, python-docx, label-studio (listed, unused), scikit-learn.

## C3. ⚠️ Big caveats — it's a toy run
- The on-disk `sample_data.json` is **50 entries of Chinese executive-bio text** (from the HF dataset), trained with the **English `bert-base-uncased` tokenizer** — a language/tokenizer mismatch.
- `trainer_state.json` shows all 10 epochs ran but only **10 optimizer steps total** (1/epoch — the training set was tiny). **Best eval F1 ≈ 0.40**, final loss ~2.07. Effectively experimental, not production-usable.
- Inference whitespace-tokenizes while training data was pre-tokenized — further degrades quality. `./resumes` and `./annotated` dirs referenced but absent.

---

# PART D — WIFI-SENSING PRESENCE DETECTOR (`wifi-sensing`)

Python, **Windows-only**. Detects human presence / counts people / localizes near the computer
using **WiFi RSSI** (and ultrasonic audio) as an anti-cheat sensor. ⚠️ Fundamentally hobby-grade:
single-AP integer-dBm RSSI at 1 Hz, no CSI.

## D1. Core scanner (`scanner.py`)
- Shells out to **Windows `netsh wlan show interfaces/networks`**, `ipconfig`, `ping`, `arp -a`; regex-parses output. Signal = connected-AP RSSI/signal%, estimates dBm as `pct/2 − 100`.
- LAN device sweep (parallel ping + ARP), classifies self/router/device, ~250-entry hardcoded **MAC-OUI→vendor** table, reverse-DNS hostnames.

## D2. The 4 phases
- **Phase 1 — baseline** (`phase1_baseline.py`): record RSSI with empty room → mean/std/etc to `baseline_stats.json`. ⚠️ Recorded baseline std 4.91 > 3 ("too noisy").
- **Phase 2 — presence** (`phase2_presence.py`): `present = |rolling_mean − baseline_mean| > 2.0 × std`. ⚠️ Any RSSI shift triggers "present"; recorded sample used a different network than baseline.
- **Phase 3 — people counting** (`phase3_counting.py`): RandomForest (100 trees) over windowed features incl. **FFT** (breathing/motion). ⚠️ Needs hand-labeled data that doesn't ship.
- **Phase 4 — localization** (`phase4_mapping.py`): 3×3 grid RSSI fingerprinting + RandomForest. ⚠️ Calibrates 1 sample/position → can't really train; localization essentially non-functional.

## D3. Ultrasonic challenge-response (`ultrasonic_emitter.py`) — the cleverest piece
- Emits inaudible tones (18.5–19.3 kHz palette) in a `sha256(session:seq)`-derived 4-tone pattern, valid 15s, via `pyaudio` (falls back to writing `.wav` files). A phone mic must report the exact pattern (±100 Hz) within the window.
- Rationale: voice calls strip >8 kHz and screen-share has no audio path, so a remote helper can't relay it; rotating patterns defeat replay. ⚠️ **The phone-side detector app and a response endpoint don't exist** — working emitter, incomplete system.

## D4. API server (`api_server.py`, Flask :5000) — what the frontend actually uses
- ⚠️ **Different method from phases 1–4:** counts **nearby phone hotspots** by SSID. `classify_phone_hotspot()` matches keywords (iphone/galaxy/pixel/oneplus/redmi/…/hotspot) OR any non-infra SSID < 25 chars (very loose → over-counts). Campus infra SSIDs (DAIICT) filtered. `estimatedPeople = (phones ≥30% signal) + 1`.
- Endpoints: `GET /api/wifi` (full state: ssid/rssi/visibleNetworks/nearbyPhones/networkDevices/estimatedPeople/presenceDetected/…), `/api/wifi/networks`, `/api/wifi/devices`, `/api/health`. ⚠️ `presenceDetected` hardcoded true after first scan.

## D5. Dashboards & extras
- **`advanced_dashboard.py`** — the math centerpiece: log-distance path-loss→distance, Fresnel-zone radius, **Kalman filter**, Bayesian presence fusion (RSSI/jitter/loss/throughput sigmoids, threshold 0.6), router ping for RTT/jitter. ⚠️ throughput is faked from RSSI; ROUTER_IP hardcoded.
- **`room_map.py`** — 2D bird's-eye live room map (heatmap, Fresnel ellipse, Kalman-smoothed person position along router↔laptop line, LAN device alerts, ultrasonic panel). ⚠️ position is a heuristic guess.
- **`live_dashboard.py`** (raw RSSI viewer), **`visualize.py`** (shared plots), **`recorder.py`** (webcam + RSSI overlay recorder; ⚠️ needs opencv, missing from requirements).
- **Deps:** numpy, pandas, scipy, matplotlib, scikit-learn, pyaudio, flask, flask-cors.

---

# PART E — BLE DETECTION APP (`ble-detection`)

Angular 20 + Ionic 8 + Capacitor 8 Android app, id `com.anticheat.bledetection`.

## E1. The BLE scanner — built and solid (`services/ble-scanner.service.ts`)
- `@capacitor-community/bluetooth-le`: `requestLEScan` (low-latency, allow duplicates), streams results into a `Map<deviceId, DetectedDevice>` exposed via RxJS subjects.
- `DetectedDevice {id, name, rssi, distance, lastSeen, txPower?}`, sorted by RSSI.
- **Device identification:** uses advertised name, else looks up MAC OUI against a ~60-entry `VENDORS` table (Apple/Samsung/OnePlus/Xiaomi/…). ⚠️ Vendor-naming only — no "phone vs earbud" / "unauthorized" threat classification.
- **Proximity by RSSI:** ≥−50 Very Close, ≥−70 Near, ≥−85 Medium, else Far. Stale devices (>30s unseen) pruned every 5s.

## E2. ⚠️ Big mismatch — the scanner isn't shown in the UI
- The only route/screen is `HomePage`, an **"Anti-Cheat Phone" relay screen**: it auto-discovers a laptop dashboard over UDP (`DiscoveryService` + a custom native `UdpDiscovery` plugin) and streams a heartbeat. **It never renders the BLE device list/RSSI/proximity.** The rich scanner is wired up but not surfaced.
- ⚠️ Unwired/stubbed extras: `relay-reporter.service.ts` (HTTP POST BLE list to `:8080/api/ble/report` — built, unused), `qr-scanner.service.ts` (MLKit QR pairing — not wired), `wifi-aware.service.ts` (native plugin not implemented), `filter-proximity.pipe.ts` (unused). `@anthropic-ai/sdk` is a dependency but never imported (dead).
- **Android perms** correctly declared: BLUETOOTH/_ADMIN/_SCAN/_CONNECT, FINE/COARSE_LOCATION, `bluetooth_le` required; CAMERA (QR), WiFi-Aware perms, INTERNET, `usesCleartextTraffic`.

---

# PART F — ANTI-CHEAT ENGINE SUITE (the R&D core)

⚠️ **One detection engine evolving through 4 stages** (+ a standalone pose research app). All four
anti-cheat packages share an **identical core** (risk weights low=2/medium=8/high=25, 60s time-decay
to ×0.3, thresholds 30/60/80/100, 3s debounce). They differ in **packaging** and **which layers are
wired in**.

```
pose-sensing  →  anti-cheating-monitor (dashboard)
              →  anticheat-bundle (copy-paste services)  →  anticheat-plugin (npm package)
session-binding  →  folded into the dashboard's sessionService
```

## F1. `pose-sensing` — the ancestor (vanilla TS + Vite)
- **`detector.ts`:** MediaPipe **Pose** (33 landmarks, modelComplexity 1, conf 0.5, CDN) + **COCO-SSD** (`mobilenet_v2`, person score ≥0.4) for multi-person.
- **`analyzer.ts`:** detects reaching (wrist > 1.6× shoulder width), reaching down (0.15), head turn (nose offset 0.18), body turned (shoulder-Z 0.35), absence, multiple people; look-away 3s/8s, reach 2s/5s, absent 5s/15s, multi-person 2s. Violations: reaching_side, reaching_down, looking_away, body_turned, person_absent, multiple_people, sustained_look_away, sustained_reaching. ⚠️ debounce here is 5000ms (downstream packages use 3000ms). No risk score — just violations + status.

## F2. `anti-cheating-monitor` — operator dashboard (React + Vite)
- Live proctor-facing dashboard (video, RiskMeter, layer cards, ViolationLog). `Orchestrator` singleton (pub/sub) + `useEngine` hook.
- **Risk engine:** weights 2/8/25, 60s decay ×0.3, sustained bonuses (absent >15s +30/>5s +10, look-away >8s +20/>3s +5). Levels: critical≥80/alert≥50/warning≥20/clear. **No auto-terminate** (monitor only).
- **Layers live:** Pose (runs MediaPipe Pose + COCO-SSD), WiFi (`wifiClient` polls `/api/wifi` every 2s → `extra_lan_devices`/`nearby_hotspots`). ⚠️ `sessionService` (face+device binding, 33-element Pose-landmark embedding) is imported but **never started by App.tsx** → dead. Canvas overlay never drawn. `lockdown`/`ble` referenced in types but no such layer here.

## F3. `anticheat-bundle` — copy-paste services + Python backend (8 layers)
Candidate-facing (silent + warnings). `RiskEngine` class (callback-based) with exam vocabulary (normal/soft_warning/hard_warning/terminated at 30/60/80/100), **auto-terminate** via `onTerminate`, +voice bonus (+15/+5). The 8 layers:
1. **faceAnalyzer** — MediaPipe FaceMesh (478 pts, host-provided): gaze (0.02), head yaw (0.4)/pitch (0.15), blink/EAR (0.12), occlusion, centering (0.2), distance buckets, look-away 2s/side-gaze 5s. Violations: no_face, multiple_faces, gaze_deviation, looking_away, constant_side_gaze, head_pose, face_occlusion, face_not_centered, shoulders/hands_not_visible, too_close/far. ⚠️ shoulder/hand checks read FaceMesh indices that aren't body points (self-documented as unreliable).
2. **poseAnalyzer** — 33 Pose landmarks + person count; same thresholds as pose-sensing.
3. **browserLockdown** — blocks copy/paste/cut (copy_paste high), context menu, many Ctrl/Cmd keys (keyboard_shortcut), DevTools (F12/Ctrl+Shift+I/J → devtools_attempt), Alt+Tab/F4 (window_switch), tab_switch (visibilitychange, maxTabSwitches 2), window_blur, fullscreen_exit; requests fullscreen on activate.
4. **voiceDetector** — Web Audio FFT (fftSize 2048), avg-freq threshold 30, 50 continuous frames (~5s) → voice_detected (high).
5. **environmentAnalyzer** — canvas frame-diff motion (threshold 15 → motion_anomaly), brightness <40/>220 (lighting_anomaly), eye z-depth (screen_reflection).
6. **wifiSensor** — polls `/api/wifi` every 3s: estimatedPeople>2 (extra_people high), close phones>2 (nearby_phones), networkDevices>3 (extra_lan_devices).
7. **sessionManager** — **AES-GCM-256** reference-photo encryption, **PBKDF2 100k** key. ⚠️ "signed token" is just base64 — forgeable.
8. **backendApi** — `POST /sessions`, `/violations`, `/risk-events`, `/sessions/:id/risk`, `/heartbeat` (graceful-fail).
- **UI:** `AntiCheatStatus.tsx` (badge + soft banner + hard modal + termination overlay).
- **`wifi-backend/`** — the same Flask WiFi server as Part D (scanner.py/api_server.py/config.py), included for self-containment.

## F4. `anticheat-plugin` — the npm package (most complete & reusable)
- `@yourorg/anticheat-plugin` v1.0.0, builds to `dist/` (CJS+ESM+types), peer-deps React+lucide-react, no ML bundled (host provides MediaPipe).
- The bundle's 6 layers + riskEngine repackaged byte-identical (only import paths differ), into `src/layers/`. **What's genuinely new** = the integration façade:
  - **`AntiCheatPlugin.ts`** — one orchestrator managing all 6 layers + RiskEngine + BackendApi; config flags (backendUrl, wifiApiUrl, maxTabSwitches, requestFullscreen, enableVoice, enableWifi); lifecycle `init→start→processFaceFrame/PoseFrame/VideoFrame/Voice→stop`; 5s `tick()` for sustained bonuses; single `handleViolation` fans out to engine + callback + backend.
  - **`useAntiCheat.ts`** — React hook exposing reactive riskLevel/score/violationCount/tabSwitchCount/terminated/warnings.
  - **`IMPLEMENTATION_GUIDE.md`** — full integration guide. ⚠️ session-binding/identity match is NOT in the live loop (sessionManager exported for encryption only).

## F5. `session-binding` — identity lock (the only BLE-aware module)
- **`faceEmbedding.ts`** — from 468-pt FaceMesh picks 48 landmarks → **144-D** vector, normalized to nose-center & cheek width.
- **`sessionBinding.ts`** — cosine similarity, SHA-256 integrity hash over {embedding, deviceId}; `verifyBinding` (face cosine ≥ **0.85**; device = bound MAC present in detected BLE list); localStorage persistence.
- **`bindingMonitor.ts`** — re-verifies every 30s; escalation: 1 mismatch forgiven, face_mismatch≥3 → binding_face_swap, device_mismatch≥3 → binding_device_swap, both≥2 → binding_full_swap (auto-terminate). Risk: FACE=25/DEVICE=20/BOTH=50, max 60.
- ⚠️ BLE device *acquisition* itself isn't implemented in any package (assumed host-provided via Web Bluetooth). This module was absorbed into the dashboard's `sessionService` but downgraded to a 33-D Pose embedding (incompatible with this 144-D one).

## F6. How the 4 anti-cheat packages compare
| | monitor (A) | bundle (B) | plugin (C) | session-binding (D) |
|---|---|---|---|---|
| Form | dashboard app | copy-paste services | **npm package** | module |
| Audience | proctor | candidate | candidate | candidate |
| Auto-terminate | ❌ | ✅ | ✅ | ✅ (full swap) |
| Layers live | Pose, WiFi (+Session dead) | Face/Pose/Browser/Voice/Env/WiFi | same 6 | Face-embed + BLE |
| Runs ML itself | ✅ (Pose+COCO) | host provides | host provides | host provides |
| Identity match | 33-D (dead) | encrypt only | encrypt only | ✅ 144-D + BLE |
- **Most complete & reusable: `anticheat-plugin` (C).** Richest *runtime*: the dashboard (A). Only real identity-binding + BLE: (D).

---

# PART G — Root planning / pitch docs
- **`ANTICHEAT_INTEGRATION_PLAN.md`** — how to wire the new layers (pose + WiFi) into the existing `TakeExam.tsx`, all feeding one risk engine; new `frontend/src/services/anticheat/` files + `AntiCheatStatus` component; backend additions (`wifiSnapshots` on ProctoringSession, `POST /sessions/:id/wifi-data`). ⚠️ It's a plan with a checklist — not proof the code shipped.
- **`PRESENTATION_GUIDE.md`** — competition pitch for TalentLeague: 5 detection layers (face/pose/browser/WiFi/session-binding) at $0 marginal cost (all ML client-side ~24 FPS), server gets only ~200-byte heartbeats every 15s. 3 headline innovations: time-decayed risk scoring, WiFi people-detection, client-side AES-256-GCM encrypted identity photos. Roadmap: Phase 1 MCQ + proctoring, Phase 2 coding, future audio/ATS/native-mobile. Freemium ($0/$49/$199).

---

# SUMMARY — what really works vs. what's a shell

**✅ Genuinely working & worth borrowing:**
- Everything in `ABC_MAIN1_FEATURES.md` (MCQ lifecycle, AI resume parsing w/ fallbacks, OAuth sandbox, browser proctoring) **plus**:
- **Real backend authorization** (JWT `protect`/`authorize`/`requireVerified` middleware + ownership checks) — the most valuable upgrade over ABC--main1.
- **Recruiter CRUD suite** (jobs, interviews, assessment templates) with offline fallback + emailed interview invites.
- **Mobile login/signup** with auth gating + password-strength meter.
- **Anti-cheat plugin (C)** — a clean, npm-installable 6-layer proctoring engine with a React hook (the best-engineered artifact in the whole folder).
- **pose-sensing** — solid standalone MediaPipe Pose + COCO-SSD behaviour detector.
- **session-binding** — face-embedding + device identity lock (the one with real 144-D embeddings + BLE concept).
- **BLE scanner service** — working Capacitor BLE scan + vendor ID + RSSI proximity.
- **WiFi scanner + ultrasonic challenge crypto + the advanced_dashboard physics/Kalman/Bayesian math** — clever, reusable building blocks.

**⚠️ Stubs / experimental / advertised-but-not-real:**
- ML resume parser: **toy run** (F1≈0.40, 10 steps, Chinese data + English tokenizer) — concept only.
- WiFi sensing: single-AP 1 Hz RSSI is too coarse; Phase 3/4 ML ship without usable models; ultrasonic has no phone-side app; api_server uses a *different*, very loose hotspot-counting heuristic.
- BLE app: rich scanner **not shown in the UI** (screen is a relay agent); relay-reporter/qr/wifi-aware unwired; Anthropic SDK dead dependency.
- Anti-cheat: dashboard's session layer dead; "signed token" forgeable; FaceMesh shoulder/hand checks unreliable; BLE acquisition unimplemented; debounce inconsistency (5000 vs 3000ms).
- Web: same 7 "coming soon" stub pages as ABC--main1 still unbuilt.

**🔒 Security notes (if reusing):** ⚠️ `backend/.env` reportedly had **real committed secrets** (rotate them); OAuth `returnUrl` open-redirect; MCQ submit still token-only; proctoring "signed token" is forgeable base64; multiple apps use `usesCleartextTraffic`/HTTP.

**🌍 Deployment context clue:** hardcoded DAIICT campus SSIDs and LAN IP `192.168.1.16` appear throughout — this was built/tested at DAIICT on one local network.
