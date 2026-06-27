import { Router } from "express";
import {
  analyzeApplication,
  compareCandidates,
  getApplicationById,
  getApplications,
  getProtectedResume,
  getShortlistedApplications,
  removeFromShortlist,
  selectCandidate,
  streamProtectedResume,
  updateApplicationStatus,
} from "../controllers/recruiterApplicationsController.js";
import { getCompanyProfile, createCompanyProfile, updateCompanyProfile, uploadCompanyLogo } from "../controllers/recruiterCompanyController.js";
import { getDashboard } from "../controllers/recruiterDashboardController.js";
import {
  addInterviewFeedback,
  cancelInterview,
  createInterview,
  generateQuestions,
  getInterviewById,
  getInterviews,
  updateInterview,
} from "../controllers/recruiterInterviewsController.js";
import {
  createDraftJob,
  createJob,
  deleteJob,
  duplicateJob,
  generateDescription,
  getJobById,
  getJobs,
  updateJob,
  updateJobStatus,
} from "../controllers/recruiterJobsController.js";
import { authenticate, requireRecruiter } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import { uploadLogo } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  applicationQuerySchema,
  applicationStatusSchema,
  compareCandidatesSchema,
  removeShortlistSchema,
} from "../validations/applicationSchemas.js";
import { companySchema } from "../validations/companySchemas.js";
import { interviewFeedbackSchema, interviewQuestionSchema, interviewSchema, interviewUpdateSchema, cancelInterviewSchema } from "../validations/interviewSchemas.js";
import { generateDescriptionSchema, jobQuerySchema, jobSchema, jobStatusSchema } from "../validations/jobSchemas.js";

const router = Router();

router.use(authenticate, requireRecruiter);

router.get("/dashboard", getDashboard);

router.get("/company", getCompanyProfile);
router.post("/company", validate(companySchema), createCompanyProfile);
router.put("/company", validate(companySchema), updateCompanyProfile);
router.post("/company/logo", uploadLogo.single("logo"), uploadCompanyLogo);

router.post("/jobs/generate-description", aiRateLimiter, validate(generateDescriptionSchema), generateDescription);
router.post("/jobs", validate(jobSchema), createJob);
router.post("/jobs/draft", validate(jobSchema), createDraftJob);
router.get("/jobs", validate(jobQuerySchema, "query"), getJobs);
router.get("/jobs/:jobId", getJobById);
router.put("/jobs/:jobId", validate(jobSchema), updateJob);
router.patch("/jobs/:jobId/status", validate(jobStatusSchema), updateJobStatus);
router.post("/jobs/:jobId/duplicate", duplicateJob);
router.delete("/jobs/:jobId", deleteJob);

router.get("/applications", validate(applicationQuerySchema, "query"), getApplications);
router.get("/applications/shortlisted", getShortlistedApplications);
router.post("/applications/compare", validate(compareCandidatesSchema), compareCandidates);
router.get("/applications/:applicationId", getApplicationById);
router.patch("/applications/:applicationId/status", validate(applicationStatusSchema), updateApplicationStatus);
router.post("/applications/:applicationId/analyze", aiRateLimiter, analyzeApplication);
router.get("/applications/:applicationId/resume", getProtectedResume);
router.get("/applications/:applicationId/resume/file", streamProtectedResume);
router.patch("/applications/:applicationId/remove-shortlist", validate(removeShortlistSchema), removeFromShortlist);
router.patch("/applications/:applicationId/select", selectCandidate);

router.get("/interviews", getInterviews);
router.post("/interviews", validate(interviewSchema), createInterview);
router.get("/interviews/:interviewId", getInterviewById);
router.put("/interviews/:interviewId", validate(interviewUpdateSchema), updateInterview);
router.patch("/interviews/:interviewId/cancel", validate(cancelInterviewSchema), cancelInterview);
router.post("/interviews/:interviewId/feedback", validate(interviewFeedbackSchema), addInterviewFeedback);
router.post("/interviews/generate-questions", aiRateLimiter, validate(interviewQuestionSchema), generateQuestions);

export default router;
