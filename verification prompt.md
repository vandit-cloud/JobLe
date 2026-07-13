Build a complete Candidate Identity Verification and Camera-Based Assessment Integrity module for an AI-powered hiring and assessment platform.

This module is used before and during candidate assessments.

Purpose:
- Before the test, capture candidate face reference images from front, left, and right angles.
- Optionally perform a liveness check.
- During the test, use the camera to check whether the same candidate remains present.
- Detect possible identity mismatch, missing face, multiple people, camera interruption, frozen video, low light, and camera covered events.
- Record events for recruiter human review.
- Do not automatically reject candidates based on AI/camera detections.

Important rule:
The system must never say “candidate cheated” automatically.
It should only create review flags such as:
- Identity review required
- Camera event recorded
- Multiple-person event recorded
- Candidate not visible
- Possible identity mismatch

Recruiters must review the evidence and make the final decision.

==================================================
TECHNOLOGY STACK
==================================================

Frontend:
- React
- TypeScript
- Tailwind CSS
- React Router
- React Hook Form
- Zod
- Axios
- Lucide React
- Toast notifications

Backend:
- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose
- JWT authentication
- Role-based authorization

Optional AI / computer vision:
- Browser-based face detection model
- Face embedding comparison model
- Optional object detection later
- Do not use emotion detection or personality prediction

Storage:
- Private cloud storage for captured images
- No public image URLs
- Short-lived signed URLs for recruiter review

Security:
- Use environment variables for secrets
- Do not expose API keys in frontend
- Encrypt sensitive data where appropriate
- Keep biometric data private
- Implement retention and auto-deletion

==================================================
USER FLOW
==================================================

Candidate starts assessment:

1. Candidate clicks Start Assessment
2. Candidate sees identity-verification notice
3. Candidate gives separate consent for camera and identity verification
4. System checks browser and camera compatibility
5. Candidate captures front face photo
6. Candidate captures left angle photo
7. Candidate captures right angle photo
8. Candidate completes optional liveness challenge
9. System creates candidate identity reference
10. Candidate starts assessment
11. During assessment, system periodically checks candidate presence and identity match
12. Camera and browser integrity events are recorded
13. Candidate submits assessment
14. Recruiter views assessment result with identity verification report
15. Recruiter reviews flags and makes final decision

==================================================
CANDIDATE ROUTES
==================================================

Create these candidate routes:

- /candidate/assessments/:attemptId/identity/notice
- /candidate/assessments/:attemptId/identity/consent
- /candidate/assessments/:attemptId/identity/system-check
- /candidate/assessments/:attemptId/identity/capture
- /candidate/assessments/:attemptId/identity/liveness
- /candidate/assessments/:attemptId/identity/complete
- /candidate/assessments/:attemptId/test
- /candidate/assessments/:attemptId/submitted

==================================================
RECRUITER ROUTES
==================================================

Create these recruiter routes:

- /recruiter/assessment-results/:attemptId/identity-report
- /recruiter/assessment-results/:attemptId/integrity-report

Recruiters can only view reports for candidates who applied to their organization.

==================================================
STEP 1: IDENTITY VERIFICATION NOTICE
==================================================

Create a notice page before camera access.

Show this message:

“This assessment uses identity verification.

Before the test, we will capture front, left, and right face images. During the test, your camera may be used to check whether the same candidate remains present.

The system may record review events such as:
- Face not visible
- Multiple people visible
- Camera disconnected
- Possible identity mismatch

These events are reviewed by authorized recruiters. They do not automatically determine your result.”

Buttons:
- Agree and Continue
- Request Alternative Verification
- Cancel

Do not start the camera before consent.

==================================================
STEP 2: CONSENT
==================================================

Create a separate consent form.

Candidate must explicitly agree to:
- Camera access
- Capturing front, left, and right reference images
- Camera monitoring during the assessment
- Storing identity-verification events
- Recruiter review of identity-verification report

Candidate must see:
- What data is captured
- Why it is captured
- Who can access it
- How long it is retained
- How to request deletion
- How to request alternative verification

Store consent record with:
- candidateId
- assessmentAttemptId
- consentAccepted
- consentAcceptedAt
- noticeVersion
- IP address
- user agent

If candidate does not agree:
- Do not start camera verification
- Allow alternative verification request if enabled

==================================================
STEP 3: CAMERA SYSTEM CHECK
==================================================

Create a camera system check page.

Check:
- Camera permission granted
- Camera device available
- Video stream working
- Candidate face visible
- Only one face visible
- Lighting sufficient
- Frame not blurry
- Browser supported
- Full-screen mode supported
- Internet connection available

Show live preview.

Display status:

- Camera: Working / Not Working
- Face visible: Yes / No
- Lighting: Good / Poor
- Multiple people: No / Yes
- Browser: Supported / Unsupported
- Internet: Stable / Unstable

Candidate actions:
- Select camera device
- Retry check
- Continue
- Request alternative verification

Do not allow test start if mandatory camera verification fails, unless recruiter/admin allows alternative verification.

==================================================
STEP 4: FRONT, LEFT, RIGHT FACE CAPTURE
==================================================

Create a face capture page.

Capture three reference photos:

1. Front photo
2. Left angle photo
3. Right angle photo

For front photo, show instruction:
“Look directly into the camera. Keep your face centered and clearly visible.”

For left photo:
“Turn your face slightly to the left.”

For right photo:
“Turn your face slightly to the right.”

For every capture, check:
- One face visible
- Face centered
- Face not blurry
- Lighting acceptable
- Face not too close
- Face not too far
- No multiple people
- Camera active

Candidate actions:
- Capture
- Retake
- Use Photo
- Continue

Store reference images privately.

Do not use public URLs.

Create face embeddings from each reference image if face matching is enabled.

==================================================
STEP 5: LIVENESS CHECK
==================================================

Add optional simple liveness check.

Supported challenge types:
- Blink twice
- Turn head left
- Turn head right
- Look at camera
- Smile
- Read random number shown on screen

For MVP, implement simple random challenge:
- Show one random challenge
- Candidate performs it
- System verifies basic movement
- If uncertain, allow retry

Liveness statuses:
- Not Required
- Pending
- Passed
- Failed
- Manual Review Required

Do not make deepfake claims.

Do not automatically reject candidate if liveness is uncertain.
Use “manual review required”.

==================================================
STEP 6: IDENTITY VERIFICATION COMPLETE
==================================================

After successful reference capture, show:

“Identity verification setup completed. You can now start the assessment.”

Show summary:
- Front photo captured
- Left photo captured
- Right photo captured
- Liveness check passed or not required
- Camera monitoring enabled
- Data retention period

Button:
- Start Assessment

==================================================
DURING TEST CAMERA MONITORING
==================================================

During assessment, periodically check the camera.

Do not compare every frame.

Recommended check interval:
- Every 10 to 20 seconds

During each check:
1. Capture frame locally
2. Detect face count
3. Check if candidate face is visible
4. Compare with reference face embeddings
5. Check camera stream status
6. Check if frame is dark or frozen
7. Record event only if issue continues for configured threshold

Detections to support:

1. Candidate face visible
2. Candidate not visible
3. Multiple people visible
4. Possible identity mismatch
5. Camera disconnected
6. Camera permission revoked
7. Camera device changed
8. Camera covered
9. Low light
10. Frozen video
11. Face outside frame

Do not add:
- Emotion detection
- Nervousness detection
- Honesty detection
- Personality prediction
- Eye-gaze cheating score
- Voice stress detection
- Automatic rejection

==================================================
DETECTION THRESHOLDS
==================================================

Use configurable thresholds.

Suggested defaults:

- Candidate not visible: 8 to 10 continuous seconds
- Multiple people visible: 3 to 5 continuous seconds
- Possible identity mismatch: 3 to 5 repeated failed checks
- Camera disconnected: immediate event
- Camera covered or dark: 10 continuous seconds
- Frozen video: 8 to 10 continuous seconds
- Device changed: immediate event

Do not create events based on a single bad frame.

Group continuous detections into one event with start time, end time, and duration.

==================================================
IDENTITY MATCHING LOGIC
==================================================

Use reference images:
- front
- left
- right

During the test:
- Detect current face
- Create current face embedding
- Compare current embedding with stored reference embeddings
- Use best match among front, left, and right references
- If match score is below threshold repeatedly, create possible mismatch event

Statuses:
- Identity Match
- Identity Uncertain
- Possible Identity Mismatch
- Face Not Visible
- Multiple People Visible

Important:
Identity mismatch must be a review flag only.

Show wording:
“Possible identity mismatch — recruiter review required.”

Do not show:
“Fake candidate detected.”
“Candidate cheated.”
“Candidate rejected.”

==================================================
CAMERA EVENT TYPES
==================================================

Create event types:

- CAMERA_PERMISSION_DENIED
- CAMERA_STREAM_STARTED
- CAMERA_STREAM_STOPPED
- CAMERA_DEVICE_CHANGED
- CAMERA_PERMISSION_REVOKED
- FRONT_PHOTO_CAPTURED
- LEFT_PHOTO_CAPTURED
- RIGHT_PHOTO_CAPTURED
- LIVENESS_CHECK_STARTED
- LIVENESS_CHECK_PASSED
- LIVENESS_CHECK_FAILED
- CANDIDATE_NOT_VISIBLE
- CANDIDATE_VISIBLE_AGAIN
- MULTIPLE_PEOPLE_VISIBLE
- POSSIBLE_IDENTITY_MISMATCH
- IDENTITY_MATCH_RESTORED
- LOW_LIGHT
- CAMERA_COVERED
- VIDEO_FROZEN
- FACE_OUTSIDE_FRAME
- ALTERNATIVE_VERIFICATION_REQUESTED

Browser integrity events may also be combined:
- TAB_SWITCHED
- FULLSCREEN_EXITED
- COPY_ATTEMPTED
- PASTE_ATTEMPTED
- MULTIPLE_SESSION_DETECTED
- IP_CHANGED

==================================================
EVENT DATA MODEL
==================================================

Every event should include:

- candidateId
- assessmentAttemptId
- verificationId
- eventType
- startedAt
- endedAt
- durationSeconds
- confidence
- severity
- source
- metadata
- snapshotKey, optional
- reviewed
- reviewedBy
- recruiterNote
- createdAt

Severity options:
- INFO
- LOW
- MEDIUM
- REVIEW_REQUIRED
- HIGH_REVIEW_REQUIRED

Example event:

{
  "attemptId": "attempt_123",
  "candidateId": "candidate_456",
  "verificationId": "verification_789",
  "eventType": "POSSIBLE_IDENTITY_MISMATCH",
  "startedAt": "2026-07-13T10:25:20Z",
  "endedAt": "2026-07-13T10:25:45Z",
  "durationSeconds": 25,
  "confidence": 0.72,
  "severity": "REVIEW_REQUIRED",
  "source": "camera",
  "reviewed": false
}

==================================================
SNAPSHOT STORAGE
==================================================

Default should be privacy-friendly.

Store:
- Reference front image
- Reference left image
- Reference right image
- Face embeddings
- Event metadata
- Optional event snapshots

Avoid by default:
- Full continuous video recording

If event snapshots are enabled:
- Store only snapshots for threshold-crossing events
- Store snapshots privately
- Use encryption at rest
- Use short retention
- Show this clearly in candidate consent notice

Never store camera images in a public folder.

==================================================
RECRUITER IDENTITY VERIFICATION REPORT
==================================================

Create recruiter Identity Verification Report page.

Route:
- /recruiter/assessment-results/:attemptId/identity-report

Show summary:

- Candidate name
- Job / assessment name
- Assessment date
- Verification status
- Identity review status
- Front photo captured
- Left photo captured
- Right photo captured
- Liveness check status
- Total identity mismatch events
- Face not visible events
- Multiple people events
- Camera interruptions
- Camera device changes

Possible verification statuses:
- Verified
- Review Recommended
- Manual Review Required
- Alternative Verification Requested
- Failed
- Not Completed

Show timeline:

Example:
10:00 — Candidate identity photos captured
10:01 — Assessment started
10:18 — Candidate not visible for 12 seconds
10:34 — Possible identity mismatch for 25 seconds
11:05 — Assessment submitted

Recruiter actions:
- Mark as reviewed
- Ignore flag
- Add internal note
- Request candidate explanation
- Request retest
- Continue candidate
- Reject after manual review

Display warning:
“Identity verification events are automated indicators. They may be incorrect and should be reviewed by a human before any hiring decision.”

==================================================
CANDIDATE POST-TEST EXPERIENCE
==================================================

After test submission, show:

“Your assessment has been submitted.”

If events occurred, show neutral message:
“Some camera or identity verification events may be reviewed by the recruiter.”

Allow optional candidate explanation for events.

Candidate explanation form:
- Internet disconnected
- Camera stopped
- Power issue
- Family member entered room
- Lighting problem
- Browser issue
- Other

Do not show:
- You cheated
- AI caught you
- You failed identity verification

==================================================
ALTERNATIVE VERIFICATION REQUEST
==================================================

Create alternative verification flow.

Candidate can request alternative verification if:
- No camera
- Camera not working
- Disability or accessibility need
- Privacy concern
- Religious or medical reason
- Poor internet
- Browser/device issue

Form fields:
- Reason category
- Explanation
- Supporting note, optional

Status:
- Requested
- Approved
- Rejected
- Needs More Information

Recruiter/admin can review and allow:
- Manual recruiter verification
- Live video verification
- In-person verification
- Non-camera test with stronger randomization
- ID verification before interview

==================================================
DATABASE MODELS
==================================================

Create Mongoose models.

CandidateIdentityVerification:

Fields:
- _id
- candidateId
- assessmentAttemptId
- organizationId
- companyId
- assessmentId
- jobId

Consent:
- consentAccepted
- consentAcceptedAt
- noticeVersion
- ipAddress
- userAgent

Reference images:
- frontImageKey
- leftImageKey
- rightImageKey

Face embeddings:
- frontEmbedding
- leftEmbedding
- rightEmbedding

Liveness:
- required
- status
- challengeType
- completedAt
- failedReason

Status:
- NOT_STARTED
- CONSENT_REQUIRED
- CAMERA_CHECK_FAILED
- REFERENCE_CAPTURE_IN_PROGRESS
- REFERENCE_CAPTURED
- LIVENESS_PENDING
- VERIFIED
- FAILED
- MANUAL_REVIEW_REQUIRED
- ALTERNATIVE_REQUESTED

Other:
- createdAt
- updatedAt
- expiresAt

IdentityVerificationEvent:

Fields:
- _id
- candidateId
- assessmentAttemptId
- verificationId
- organizationId
- eventType
- startedAt
- endedAt
- durationSeconds
- confidence
- severity
- source
- metadata
- snapshotKey
- reviewed
- reviewedBy
- reviewedAt
- recruiterNote
- createdAt

AlternativeVerificationRequest:

Fields:
- _id
- candidateId
- assessmentAttemptId
- organizationId
- reasonCategory
- explanation
- status
- reviewedBy
- reviewedAt
- reviewerNote
- createdAt
- updatedAt

==================================================
BACKEND APIs
==================================================

Candidate APIs:

POST /api/candidate/assessments/:attemptId/identity/consent

GET /api/candidate/assessments/:attemptId/identity/status

POST /api/candidate/assessments/:attemptId/identity/system-check

POST /api/candidate/assessments/:attemptId/identity/capture-front

POST /api/candidate/assessments/:attemptId/identity/capture-left

POST /api/candidate/assessments/:attemptId/identity/capture-right

POST /api/candidate/assessments/:attemptId/identity/liveness

POST /api/candidate/assessments/:attemptId/identity/event

POST /api/candidate/assessments/:attemptId/identity/alternative-request

POST /api/candidate/assessments/:attemptId/identity/explanation

Recruiter APIs:

GET /api/recruiter/assessment-results/:attemptId/identity-report

PATCH /api/recruiter/assessment-results/:attemptId/identity-report/review

POST /api/recruiter/assessment-results/:attemptId/identity-report/request-retest

POST /api/recruiter/assessment-results/:attemptId/identity-report/request-explanation

Admin APIs:

GET /api/admin/identity-verification/events

GET /api/admin/identity-verification/alternative-requests

PATCH /api/admin/identity-verification/alternative-requests/:requestId/review

==================================================
FRONTEND COMPONENTS
==================================================

Create reusable components:

- IdentityVerificationNotice
- CameraConsentForm
- CameraSystemCheck
- CameraPreview
- FaceCaptureStep
- FrontFaceCapture
- LeftFaceCapture
- RightFaceCapture
- CaptureQualityChecklist
- LivenessChallenge
- VerificationProgressStepper
- VerificationCompleteCard
- AlternativeVerificationRequestForm
- TestCameraMonitor
- CameraEventRecorder
- IdentityStatusBadge
- IntegrityEventBadge
- IdentityReportSummary
- IdentityEventTimeline
- RecruiterIdentityReport
- EventReviewModal
- CandidateExplanationForm
- RetentionNotice
- PrivacyWarningCard

==================================================
CAMERA MONITORING COMPONENT BEHAVIOR
==================================================

Create TestCameraMonitor component.

It should:
- Start camera stream only after consent
- Show small camera preview during test
- Periodically run detection checks
- Send events to backend
- Avoid sending continuous video
- Stop camera after test submission
- Clean up camera tracks when component unmounts

Required cleanup:
- Stop all MediaStream tracks
- Clear intervals
- Clear detection workers
- Remove event listeners

If camera fails during test:
- Show warning
- Record CAMERA_STREAM_STOPPED
- Allow retry
- Continue or pause depending on assessment settings

==================================================
ASSESSMENT SETTINGS INTEGRATION
==================================================

Recruiter should configure identity verification in assessment settings.

Settings:
- Require identity verification
- Require front photo
- Require left photo
- Require right photo
- Require liveness check
- Enable same-person monitoring
- Enable event snapshots
- Monitoring interval
- Face-mismatch threshold
- Candidate-absence threshold
- Multiple-person threshold
- Camera-required mode
- Alternative verification allowed
- Retention period

Do not enable full video recording by default.

==================================================
SECURITY REQUIREMENTS
==================================================

Implement:

- JWT authentication
- Candidate ownership checks
- Recruiter organization ownership checks
- Private storage only
- No public image URLs
- Short-lived signed URLs
- Encryption at rest
- HTTPS only
- Rate limiting
- Input validation
- File size validation for images
- Image type validation
- Malware scanning for uploaded images if stored
- Access audit logs
- Retention auto-delete job
- Admin access restrictions
- Candidate deletion request support

No candidate should access another candidate’s verification data.

No recruiter should access another company’s candidate verification data.

Do not use candidate images to train AI models unless separate explicit permission exists.

==================================================
PRIVACY AND RETENTION
==================================================

Create retention settings.

Suggested defaults:
- Reference photos: 30 to 90 days
- Event snapshots: 30 days
- Event metadata: 90 days
- Full video: not enabled by default

Automatically delete expired biometric data.

Create deletion job:
- Runs daily
- Finds expired verification records
- Deletes reference images
- Deletes event snapshots
- Removes or anonymizes embeddings
- Keeps minimal audit records if required

Candidate privacy page should show:
- Identity verification history
- Assessment name
- Company name
- Captured date
- Retention expiry date
- Request deletion option

==================================================
ERROR HANDLING
==================================================

Candidate-friendly errors:

Camera denied:
“Camera permission is required for this assessment. Please allow camera access or request alternative verification.”

No face detected:
“We cannot clearly see your face. Please adjust your camera and lighting.”

Multiple faces:
“Please make sure only you are visible in the camera frame.”

Low light:
“Your camera view is too dark. Please improve the lighting.”

Capture failed:
“We could not capture a clear image. Please try again.”

Face mismatch during test:
Do not show harsh message. Show:
“We are having trouble verifying your camera view. Please make sure you are clearly visible.”

==================================================
DO NOT BUILD THESE FEATURES
==================================================

Do not build:
- Emotion detection
- Honesty detection
- Personality prediction
- Nervousness scoring
- Eye-gaze cheating score
- Voice-stress analysis
- Automatic rejection from camera flags
- Ethnicity classification
- Attractiveness scoring
- Disability inference

==================================================
FINAL DELIVERABLES
==================================================

Generate:

1. Candidate identity verification pages
2. Camera consent flow
3. Camera system check
4. Front, left, right photo capture
5. Optional liveness challenge
6. Camera monitoring during test
7. Identity event recording
8. Recruiter identity verification report
9. Candidate explanation flow
10. Alternative verification request flow
11. Backend APIs
12. Mongoose models
13. Authorization middleware
14. Private image storage service
15. Short-lived signed URL service
16. Event timeline UI
17. Retention and auto-delete logic
18. Audit logs
19. Assessment settings integration
20. Responsive UI
21. Loading, error, and success states
22. README setup instructions

Build real backend functionality.

Do not use only fake frontend data.

Do not automatically reject candidates based on identity verification or camera events.

All camera and identity results must be review indicators for human recruiters.