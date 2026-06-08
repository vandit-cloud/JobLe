# TalentLeague — The API Server, Explained From Zero

This guide explains what our API server is, how to read things like
`POST /api/jobs` without confusion, and maps EVERY endpoint in this project
to what it actually does in plain language.

---

## 1. What is the API server, really?

Picture a bank. Customers (browsers) are never allowed into the vault
(the database). Instead there's a **counter with a teller**. You walk up,
prove who you are, say what you want in a standard format, and the teller
decides: is this allowed? does it make sense? Then THEY go to the vault
for you and bring back the answer.

Our Node/Express server (`server/`) is that teller. It is the ONLY program
that talks to MongoDB. The React app never touches the database — it can
only *ask the server*, and the server enforces all the rules:

- **Who are you?** (the token check)
- **Are you allowed to do this?** (recruiter vs candidate, owner-scoping)
- **Is the data valid?** (a test must have a title, etc.)
- **What are you allowed to see back?** (candidates never get correctIndex)

Why can't the browser talk to the database directly? Because the browser
belongs to the USER — including dishonest users. Anything in the browser
can be read and modified by whoever's sitting there (F12 → DevTools). The
database password, the answer keys, other people's data — none of it can
ever be trusted to the browser. The server is OUR machine, running OUR
rules, and that's the entire reason it exists.

---

## 2. How to read "POST /api/jobs" — decoded once and for all

Every request a browser makes has exactly four parts. Think of it as
**mailing a letter**:

| Part | Letter analogy | Example |
|---|---|---|
| **URL** (the address) | the street address on the envelope | `/api/jobs` |
| **Method** (the verb) | what you want done there | `POST` |
| **Headers** | info written ON the envelope | `Authorization: Bearer <token>` ("here's my ID card") |
| **Body** | the contents inside | `{ "title": "Backend Dev", "requiredSkills": ["node"] }` |

### The URL is a noun — it names a THING

`/api/jobs` means "the collection of jobs". `/api/jobs/12345` means "the
one job whose id is 12345". `/api/jobs/12345/matches` means "the matches
belonging to that job". It reads like a folder path of ever-more-specific
things.

### The method is a verb — what to DO with that thing

There are only four you need:

| Method | Plain meaning | Everyday equivalent |
|---|---|---|
| **GET** | "show me" | reading — changes nothing |
| **POST** | "create this" / "do this" | submitting a form |
| **PUT** | "update this" | editing and re-saving |
| **DELETE** | "remove this" | the trash can |

So:

- `GET /api/jobs` = **"show me the jobs"**
- `POST /api/jobs` = **"create a new job (details in the body)"**
- `PUT /api/jobs/123` = **"update job 123 with what's in the body"**
- `DELETE /api/jobs/123` = **"remove job 123"**

Same address, four different verbs, four different actions. That's the
whole trick. `POST /api/jobs` stops being scary the moment you read it as
a sentence: **"Hey server, CREATE a job — here are the details."**

### The response — the server's reply letter

Every reply has a **status code** (a number summarizing how it went) and
usually a JSON body. The codes we actually use:

| Code | Meaning | Where YOU'VE already seen it |
|---|---|---|
| 200 | "done, here you go" | every successful page load |
| 201 | "created it" | saving a test |
| 400 | "your request makes no sense" | creating a test with no title |
| 401 | "you're not logged in" | expired token → login page |
| 403 | "logged in, but not allowed" | candidate token on a recruiter route |
| 404 | "no such thing" | private job opened by guessed id |
| 409 | "conflicts with what exists" | **"You have already taken this test."** |
| 500/502 | "the server/its helper broke" | Python service not running |

---

## 3. The life of one request (our real code, step by step)

A candidate clicks **Apply** with a resume. Here is the complete journey:

```
1. Apply.jsx (the page)        calls applyToJob(jobId, file)
                                          │
2. api.js (the phone book)     applyToJob says: fetch POST /api/board/<jobId>/apply
   — every server call our     and puts the file in the body. This file is the
   app can make lives here     ONLY place in React that knows real URLs.
                                          │
                              ───── leaves the browser ─────
                                          │
3. index.js (reception)        sees the URL starts with /api/board and hands it
                               to routes/board.js ("the board department")
                                          │
4. routes/board.js (the        runs the matching route handler:
   department that handles       - is this job real and public? (404 if not)
   board things)                 - parseFile() → asks Python :8000 to read the file
                                 - saves a Candidate row (owner = the job's recruiter)
                                 - matchText() → asks Python to score it vs the job
                                 - saves a Match row
                                          │
5. MongoDB Atlas               the new rows now exist — THIS is the moment the
                               "two sides" became connected
                                          │
6. The response                201 "created" + { message, jobTitle, matchScore }
                               travels back to the browser
                                          │
7. Apply.jsx                   stores the reply in state → React re-renders →
                               the candidate sees the 🎉 success screen
```

Every feature in the app is this same seven-step shape with different
details. Once you can follow this one, you can follow all of them.

---

## 4. The departments (route files) and every endpoint

`server/index.js` is **reception**: it looks at the start of the URL and
forwards to the right department. Each `routes/*.js` file is one
department. 🔓 = public (no login) · 🔑 = recruiter login · 🎓 = candidate login

### `routes/auth.js` — the front desk (who are you?)
| Request | In plain language | Used by (page) |
|---|---|---|
| 🔓 POST `/api/auth/register` | "make me an account" (body: email, password, role, company) | Register.jsx |
| 🔓 POST `/api/auth/login` | "log me in, here's my password" → returns the token | Login.jsx |

The **token** that comes back is a tamper-proof ID card. The browser
stores it and shows it (in the Authorization header) on every later
request. That's how the server knows who's asking without re-checking
the password each time.

### `routes/tests.js` — the exams department
| Request | In plain language | Used by |
|---|---|---|
| 🔑 POST `/api/tests` | "save this new test" (if candidateId rides along: "…and assign it to that candidate") | CreateTest.jsx |
| 🔑 GET `/api/tests` | "list MY tests" | Home.jsx |
| 🔓 GET `/api/tests/<id>` | "give me this test FOR TAKING" — answers stripped out! | TakeTest.jsx |
| 🔓 POST `/api/tests/<id>/submit` | "here are my answers, grade me" — server scores, saves a Result, completes the assignment | TakeTest.jsx |
| 🔑 GET `/api/tests/<id>/edit` | "give me this test FOR EDITING" — answers included (recruiter-only) | EditTest.jsx |
| 🔑 PUT `/api/tests/<id>` | "save my edits to this test" | EditTest.jsx |
| 🔑 DELETE `/api/tests/<id>` | "delete this test and its results" | Home.jsx |
| 🔑 GET `/api/tests/<id>/results` | "who took this test and how did they do?" | Results.jsx |

Note the deliberate TWO doors to the same test: the taking door (answers
hidden) and the editing door (answers visible, recruiter-only). Keeping
them as separate routes means the safe one can never accidentally leak.

### `routes/jobs.js` — the openings department
| Request | In plain language | Used by |
|---|---|---|
| 🔑 POST `/api/jobs` | "save this job opening" | Jobs.jsx |
| 🔑 GET `/api/jobs` | "list MY jobs" | Jobs.jsx |
| 🔑 GET `/api/jobs/<id>` | "show me this job of mine" | BulkMatch.jsx |
| 🔑 PUT `/api/jobs/<id>` | "update it" (also how publish/unpublish flips isPublic) | Jobs.jsx |
| 🔑 DELETE `/api/jobs/<id>` | "remove it (and its match rows)" | Jobs.jsx |
| 🔑 POST `/api/jobs/<id>/match` | "score THIS uploaded file against this job" (one-off) | MatchResume.jsx |
| 🔑 POST `/api/jobs/<id>/match-bulk` | "score these many files, rank them" (one-off) | — legacy |
| 🔑 POST `/api/jobs/<id>/match-stored` | "re-score every SAVED candidate against this job" | BulkMatch.jsx |
| 🔑 GET `/api/jobs/<id>/matches` | "show the saved ranked shortlist" | BulkMatch.jsx |

### `routes/candidates.js` — the talent-pool department
| Request | In plain language | Used by |
|---|---|---|
| 🔑 POST `/api/candidates/upload` | "parse these resumes ONCE and save them as people" | Candidates.jsx |
| 🔑 GET `/api/candidates` | "list MY talent pool" | Candidates.jsx |
| 🔑 GET `/api/candidates/<id>` | "full profile of this one (incl. resume text)" | — |
| 🔑 POST `/api/candidates/<id>/generate-test` | "draft AI questions from their stored resume" | Candidates.jsx, BulkMatch.jsx |
| 🔑 DELETE `/api/candidates/<id>` | "remove them (and their match rows)" | Candidates.jsx |

### `routes/board.js` — the public notice-board (no login!)
| Request | In plain language | Used by |
|---|---|---|
| 🔓 GET `/api/board` | "what jobs are published?" (company name shown, recruiter email hidden) | Board.jsx |
| 🔓 GET `/api/board/<jobId>` | "details of this published job" | Apply.jsx |
| 🔓 POST `/api/board/<jobId>/apply` | "here's my resume, I want this job" → lands in the recruiter's pool + auto-scored | Apply.jsx |

### `routes/assignments.js` — the invitations department
| Request | In plain language | Used by |
|---|---|---|
| 🔑 GET `/api/assignments` | "which tests have I sent, and how did people score?" | Candidates.jsx, BulkMatch.jsx |
| 🎓 GET `/api/assignments/mine` | "which tests are waiting for ME?" (matched by email) | MyTests.jsx |
| 🔓 GET `/api/assignments/<id>/status` | "is this invitation already used?" (so a reload shows 'done' instead of re-asking) | TakeTest.jsx |

### `routes/resume.js` — the parser pass-through
| Request | In plain language | Used by |
|---|---|---|
| 🔑 POST `/api/resume/analyze` | "read this resume file, tell me what's in it" | ResumeUpload.jsx |
| 🔑 POST `/api/resume/generate-test` | "draft AI questions from this file" | ResumeUpload.jsx |

These two just forward the file to the Python service and relay the
answer — Node acts as a gateway so the browser never talks to Python
directly (one door, one set of rules).

---

## 5. The bouncers (middleware)

Some routes have a guard standing in front of them. In Express, that's a
function that runs BEFORE the route:

- `middleware/auth.js` — checks the token AND that you're a **recruiter**.
  Standing in front of every 🔑 route above.
- `middleware/authCandidate.js` — same check but requires a **candidate**.
  In front of the 🎓 route.
- 🔓 routes have no bouncer on purpose — but they compensate inside:
  the board only shows `isPublic` jobs, the taking-door strips answers, etc.

The rule of thumb you'll see everywhere in our code: **the browser-side
checks are politeness; the server-side checks are the law.** Anything
that matters is enforced here, in routes and middleware — never only in
React.

---

## 6. The flows — endpoints chained into stories

**Recruiter publishes a job:**
"save this job" → "update it: isPublic true" → it now answers to
"what jobs are published?"

**Candidate applies:**
"what jobs are published?" → "details of this one" → "here's my resume" —
and the server quietly does THREE things with that one request: asks
Python to read the file, saves the person into the recruiter's pool,
saves their score against the job.

**Recruiter sends a test:**
"draft AI questions from their stored resume" → recruiter reviews/edits →
"save this new test (and assign it to that candidate)"

**Candidate takes it:**
"which tests are waiting for me?" → "give me the test (answers stripped)" →
"here are my answers, grade me" → the server scores it, saves the Result,
stamps the assignment "completed". Next page load, the recruiter's
"which tests have I sent?" shows the score — lie-detector complete.

Notice every story is just: pages asking the departments for things, and
the departments reading/writing the same shared database. That IS the app.
