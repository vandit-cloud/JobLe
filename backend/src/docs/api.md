# API Overview

## Auth

Base path: `/api/auth`

- `POST /recruiter/login`
- `POST /candidate/login`
- `GET /me`

## Public API

Base path: `/api/public`

- `GET /subscription-plans`
- `GET /jobs`
- `GET /jobs/:jobId`
- `GET /companies/:companyId`
- `GET /companies/:companyId/jobs`

## Recruiter API

Base path: `/api/recruiter`

## Dashboard

- `GET /dashboard`

## Company

- `GET /company`
- `POST /company`
- `PUT /company`
- `POST /company/logo`

## Jobs

- `POST /jobs`
- `POST /jobs/draft`
- `POST /jobs/generate-description`
- `GET /jobs?page=1&limit=10&search=&status=&employmentType=&workplaceType=&sort=newest`
- `GET /jobs/:jobId`
- `PUT /jobs/:jobId`
- `PATCH /jobs/:jobId/status`
- `POST /jobs/:jobId/duplicate`
- `DELETE /jobs/:jobId`

## Applications

- `GET /applications`
- `GET /applications/:applicationId`
- `PATCH /applications/:applicationId/status`
- `POST /applications/:applicationId/analyze`
- `GET /applications/:applicationId/resume`
- `GET /applications/shortlisted`
- `PATCH /applications/:applicationId/remove-shortlist`
- `PATCH /applications/:applicationId/select`
- `POST /applications/compare`

## Interviews

- `GET /interviews`
- `POST /interviews`
- `GET /interviews/:interviewId`
- `PUT /interviews/:interviewId`
- `PATCH /interviews/:interviewId/cancel`
- `POST /interviews/:interviewId/feedback`
- `POST /interviews/generate-questions`

## Notes

- All recruiter endpoints require `Authorization: Bearer <token>`.
- AI endpoints are rate-limited.
- Resume URLs are only returned to authenticated recruiters who own the application.
- Jobs with applications are soft-deleted by archiving instead of permanent deletion.

## Candidate API

Base path: `/api/candidate`

### Dashboard and Profile

- `GET /dashboard`
- `GET /profile`
- `PUT /profile`

### Resume Management

- `GET /resumes`
- `POST /resumes`
- `GET /resumes/:resumeId`
- `GET /resumes/:resumeId/file`
- `DELETE /resumes/:resumeId`
- `PATCH /resumes/:resumeId/default`
- `POST /resumes/:resumeId/analyze`
- `PUT /resumes/:resumeId/confirm-extracted-data`

### Saved Jobs and Matching

- `GET /saved-jobs`
- `POST /saved-jobs/:jobId`
- `DELETE /saved-jobs/:jobId`
- `GET /jobs/:jobId/match`

### Applications

- `POST /jobs/:jobId/applications`
- `POST /jobs/:jobId/applications/draft`
- `GET /applications`
- `GET /applications/:applicationId`
- `PUT /applications/:applicationId`
- `POST /applications/:applicationId/submit`
- `PATCH /applications/:applicationId/withdraw`

### Interviews

- `GET /interviews`
- `GET /interviews/:interviewId`
- `PATCH /interviews/:interviewId/confirm`
- `POST /interviews/:interviewId/reschedule-request`
- `POST /interviews/:interviewId/add-to-calendar`

### Notifications

- `GET /notifications`
- `PATCH /notifications/:notificationId/read`
- `PATCH /notifications/:notificationId/unread`
- `PATCH /notifications/read-all`
- `DELETE /notifications/:notificationId`
- `DELETE /notifications/read`

### Privacy and Account Controls

- `GET /privacy`
- `PUT /privacy`
- `POST /privacy/data-export`
- `POST /privacy/deactivate-account`
- `POST /privacy/delete-account`
- `GET /security/sessions`
- `DELETE /security/sessions/:sessionId`
- `DELETE /security/sessions/others`

### Candidate Assessments

- `GET /assessment/:invitationToken`
- `POST /assessment/:invitationToken/verify`
- `POST /assessment/:invitationToken/resume`
- `PUT /assessment/:invitationToken/profile`
- `POST /assessment/:invitationToken/start`
- `POST /assessment/:invitationToken/save-answer`
- `POST /assessment/:invitationToken/run-code`
- `POST /assessment/:invitationToken/integrity-event`
- `POST /assessment/:invitationToken/submit`
- `GET /assessment-results/:attemptId`
- `GET /my-assessments`
