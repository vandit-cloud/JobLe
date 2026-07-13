import { Router } from "express";
import {
  getCandidateAssessmentContext,
  getCandidateAssessmentResult,
  getCandidateAssessments,
  recordCandidateIntegrityEvent,
  runCandidateCode,
  saveCandidateAnswer,
  startCandidateAssessment,
  submitCandidateAssessment,
  updateCandidateProfile,
  uploadCandidateResume,
  verifyCandidateInvitation,
} from "../controllers/candidateAssessmentsController.js";
import {
  analyzeCandidateResume,
  confirmCandidateResumeExtractedData,
  deleteCandidateResume,
  getCandidateResumeById,
  getCandidateResumes,
  setDefaultCandidateResume,
  streamCandidateResumeFile,
  uploadCandidateResumeVersion,
} from "../controllers/candidateResumeController.js";
import {
  getCandidateSkillPassport,
  getCandidateTalentInvitations,
  respondToTalentInvitation,
  startCandidateStandardSkillTest,
  submitCandidateStandardSkillTest,
  updateCandidatePassportSkills,
} from "../controllers/candidateSkillPassportController.js";
import {
  deactivateCandidateAccount,
  deleteCandidateAccount,
  deleteCandidateSecuritySession,
  deleteOtherCandidateSecuritySessions,
  exportCandidateData,
  getCandidateSecuritySessions,
} from "../controllers/candidateAccountController.js";
import {
  createCandidateApplication,
  createCandidateApplicationDraft,
  deleteNotification,
  deleteReadNotifications,
  downloadCandidateInterviewCalendarInvite,
  getCandidateApplicationById,
  getCandidateApplications,
  getCandidateDashboard,
  getCandidateInterviewById,
  getCandidateInterviews,
  getCandidateJobMatch,
  getCandidateNotifications,
  getCandidatePrivacy,
  getCandidateProfile,
  getSavedJobs,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  confirmCandidateInterview,
  requestCandidateInterviewReschedule,
  removeSavedJob,
  saveJob,
  submitCandidateApplication,
  streamCandidateApplicationResume,
  updateCandidatePrivacy,
  updateCandidateApplicationDraft,
  updateCandidateProfileDetails,
  withdrawCandidateApplication,
} from "../controllers/candidatePortalController.js";
import { authenticate, requireCandidate } from "../middleware/auth.js";
import { aiRateLimiter, resumeUploadLimiter } from "../middleware/rateLimiter.js";
import { uploadResume } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  candidateJobApplicationSchema,
  candidateDeactivateAccountSchema,
  candidateDeleteAccountSchema,
  candidateInterviewRescheduleSchema,
  candidatePrivacySchema,
  candidateProfileSchema as candidatePortalProfileSchema,
  candidateResumeConfirmSchema,
} from "../validations/candidatePortalSchemas.js";
import {
  candidateProfileSchema,
  integrityEventSchema,
  runCodeSchema,
  saveAnswerSchema,
  verifyInvitationSchema,
} from "../validations/candidateAssessmentSchemas.js";

const router = Router();

router.get("/assessment/:invitationToken", getCandidateAssessmentContext);
router.post("/assessment/:invitationToken/verify", validate(verifyInvitationSchema), verifyCandidateInvitation);
router.post("/assessment/:invitationToken/resume", resumeUploadLimiter, uploadResume.single("resume"), uploadCandidateResume);
router.put("/assessment/:invitationToken/profile", validate(candidateProfileSchema), updateCandidateProfile);
router.post("/assessment/:invitationToken/start", startCandidateAssessment);
router.post("/assessment/:invitationToken/save-answer", validate(saveAnswerSchema), saveCandidateAnswer);
router.post("/assessment/:invitationToken/run-code", aiRateLimiter, validate(runCodeSchema), runCandidateCode);
router.post("/assessment/:invitationToken/integrity-event", validate(integrityEventSchema), recordCandidateIntegrityEvent);
router.post("/assessment/:invitationToken/submit", submitCandidateAssessment);

router.use(authenticate, requireCandidate);

router.get("/dashboard", getCandidateDashboard);
router.get("/profile", getCandidateProfile);
router.put("/profile", validate(candidatePortalProfileSchema), updateCandidateProfileDetails);
router.get("/resumes", getCandidateResumes);
router.post("/resumes", resumeUploadLimiter, uploadResume.single("resume"), uploadCandidateResumeVersion);
router.get("/resumes/:resumeId", getCandidateResumeById);
router.get("/resumes/:resumeId/file", streamCandidateResumeFile);
router.delete("/resumes/:resumeId", deleteCandidateResume);
router.patch("/resumes/:resumeId/default", setDefaultCandidateResume);
router.post("/resumes/:resumeId/analyze", analyzeCandidateResume);
router.put("/resumes/:resumeId/confirm-extracted-data", validate(candidateResumeConfirmSchema), confirmCandidateResumeExtractedData);
router.get("/skill-passport", getCandidateSkillPassport);
router.put("/skill-passport/skills", updateCandidatePassportSkills);
router.post("/skill-passport/start-standard-test", startCandidateStandardSkillTest);
router.post("/skill-passport/submit-standard-test", submitCandidateStandardSkillTest);
router.get("/skill-passport/invitations", getCandidateTalentInvitations);
router.patch("/skill-passport/invitations/:invitationId/respond", respondToTalentInvitation);
router.get("/saved-jobs", getSavedJobs);
router.post("/saved-jobs/:jobId", saveJob);
router.delete("/saved-jobs/:jobId", removeSavedJob);
router.get("/jobs/:jobId/match", getCandidateJobMatch);
router.post("/jobs/:jobId/applications", validate(candidateJobApplicationSchema), createCandidateApplication);
router.post("/jobs/:jobId/applications/draft", validate(candidateJobApplicationSchema), createCandidateApplicationDraft);
router.get("/applications", getCandidateApplications);
router.get("/applications/:applicationId", getCandidateApplicationById);
router.get("/applications/:applicationId/resume/file", streamCandidateApplicationResume);
router.put("/applications/:applicationId", validate(candidateJobApplicationSchema), updateCandidateApplicationDraft);
router.post("/applications/:applicationId/submit", submitCandidateApplication);
router.patch("/applications/:applicationId/withdraw", withdrawCandidateApplication);
router.get("/interviews", getCandidateInterviews);
router.get("/interviews/:interviewId", getCandidateInterviewById);
router.patch("/interviews/:interviewId/confirm", confirmCandidateInterview);
router.post("/interviews/:interviewId/reschedule-request", validate(candidateInterviewRescheduleSchema), requestCandidateInterviewReschedule);
router.post("/interviews/:interviewId/add-to-calendar", downloadCandidateInterviewCalendarInvite);
router.get("/notifications", getCandidateNotifications);
router.patch("/notifications/:notificationId/read", markNotificationRead);
router.patch("/notifications/:notificationId/unread", markNotificationUnread);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.delete("/notifications/:notificationId", deleteNotification);
router.delete("/notifications/read", deleteReadNotifications);
router.get("/privacy", getCandidatePrivacy);
router.put("/privacy", validate(candidatePrivacySchema), updateCandidatePrivacy);
router.post("/privacy/data-export", exportCandidateData);
router.post("/privacy/deactivate-account", validate(candidateDeactivateAccountSchema), deactivateCandidateAccount);
router.post("/privacy/delete-account", validate(candidateDeleteAccountSchema), deleteCandidateAccount);
router.get("/security/sessions", getCandidateSecuritySessions);
router.delete("/security/sessions/others", deleteOtherCandidateSecuritySessions);
router.delete("/security/sessions/:sessionId", deleteCandidateSecuritySession);
router.get("/assessment-results/:attemptId", getCandidateAssessmentResult);
router.get("/my-assessments", getCandidateAssessments);

export default router;
