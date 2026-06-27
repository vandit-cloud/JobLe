# AI Recruiter Module

Full-stack recruiter, assessment, subscription, and candidate-side module for an AI-powered hiring platform using React, TypeScript, Tailwind CSS, Node.js, Express, MongoDB, Mongoose, JWT, React Hook Form, Zod, Axios, Lucide React, and Recharts.

## Structure

- `backend` - Express API, MongoDB models, seed script, recruiter auth, candidate auth, AI endpoints
- `frontend` - React recruiter and candidate dashboards, public job browsing, protected routes, reusable UI components
- `docs` - Additional documentation

## Features

- Recruiter authentication with JWT
- Candidate authentication with JWT and session tracking
- Recruiter-only protected routes and ownership checks
- Candidate-only protected routes and ownership checks
- Company profile management with logo upload and completion tracking
- Job creation, drafts, publishing, duplication, pause/close/reopen workflows
- Public jobs browsing, job details, and company pages
- Applicant management with AI-assisted match analysis
- Shortlist management and candidate comparison
- Interview scheduling, feedback, and AI-generated question suggestions
- Candidate dashboard, profile, resumes, applications, interviews, notifications, privacy, and assessment history
- Dashboard analytics backed by MongoDB aggregations
- Seeded development data for recruiters, candidates, jobs, applications, and interviews

## Getting Started

1. Copy `.env.example` to `.env` and update values.
2. Install dependencies:

```bash
npm install
```

3. Seed the database:

```bash
npm run seed
```

4. Start both apps:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173` and backend runs on `http://localhost:5000`.

## Demo Recruiter Login

After running the seed script:

- Email: `recruiter@novaedge.ai`
- Password: `Recruiter@123`

## Demo Candidate Login

- Email: `aarav.patel@example.com`
- Password: `Candidate@123`

## API Overview

Public and auth prefixes:

- `GET /api/public/jobs`
- `GET /api/public/jobs/:jobId`
- `GET /api/public/companies/:companyId`
- `GET /api/public/companies/:companyId/jobs`
- `POST /api/auth/recruiter/login`
- `POST /api/auth/candidate/login`
- `GET /api/auth/me`

Recruiter prefix: `/api/recruiter`

- `GET /api/recruiter/dashboard`
- `GET|POST|PUT /api/recruiter/company`
- `POST /api/recruiter/company/logo`
- `POST /api/recruiter/jobs`
- `POST /api/recruiter/jobs/draft`
- `POST /api/recruiter/jobs/generate-description`
- `GET /api/recruiter/jobs`
- `GET /api/recruiter/jobs/:jobId`
- `PUT /api/recruiter/jobs/:jobId`
- `PATCH /api/recruiter/jobs/:jobId/status`
- `POST /api/recruiter/jobs/:jobId/duplicate`
- `DELETE /api/recruiter/jobs/:jobId`
- `GET /api/recruiter/applications`
- `GET /api/recruiter/applications/:applicationId`
- `PATCH /api/recruiter/applications/:applicationId/status`
- `POST /api/recruiter/applications/:applicationId/analyze`
- `GET /api/recruiter/applications/:applicationId/resume`
- `GET /api/recruiter/applications/shortlisted`
- `PATCH /api/recruiter/applications/:applicationId/remove-shortlist`
- `PATCH /api/recruiter/applications/:applicationId/select`
- `POST /api/recruiter/applications/compare`
- `GET /api/recruiter/interviews`
- `POST /api/recruiter/interviews`
- `GET /api/recruiter/interviews/:interviewId`
- `PUT /api/recruiter/interviews/:interviewId`
- `PATCH /api/recruiter/interviews/:interviewId/cancel`
- `POST /api/recruiter/interviews/:interviewId/feedback`
- `POST /api/recruiter/interviews/generate-questions`

Candidate prefix: `/api/candidate`

- `GET /api/candidate/dashboard`
- `GET|PUT /api/candidate/profile`
- `GET|POST /api/candidate/resumes`
- `GET /api/candidate/resumes/:resumeId`
- `PATCH /api/candidate/resumes/:resumeId/default`
- `POST /api/candidate/resumes/:resumeId/analyze`
- `PUT /api/candidate/resumes/:resumeId/confirm-extracted-data`
- `GET|POST|DELETE /api/candidate/saved-jobs`
- `GET /api/candidate/jobs/:jobId/match`
- `POST /api/candidate/jobs/:jobId/applications`
- `POST /api/candidate/jobs/:jobId/applications/draft`
- `GET /api/candidate/applications`
- `GET|PUT /api/candidate/applications/:applicationId`
- `POST /api/candidate/applications/:applicationId/submit`
- `PATCH /api/candidate/applications/:applicationId/withdraw`
- `GET /api/candidate/interviews`
- `PATCH /api/candidate/interviews/:interviewId/confirm`
- `POST /api/candidate/interviews/:interviewId/reschedule-request`
- `GET|PUT /api/candidate/privacy`
- `POST /api/candidate/privacy/data-export`
- `POST /api/candidate/privacy/deactivate-account`
- `POST /api/candidate/privacy/delete-account`
- `GET /api/candidate/security/sessions`

See [backend/src/docs/api.md](/F:/hiring%20project/backend/src/docs/api.md) for request and response details.
