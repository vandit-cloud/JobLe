import { Router } from "express";
import {
  getRecruiterIdentityReport,
  requestCandidateExplanation,
  requestIdentityRetest,
  reviewRecruiterIdentityReport,
  streamSignedIdentityImage,
} from "../controllers/assessmentIdentityVerificationController.js";
import {
  adjustAssessmentScore,
  cancelInvitation,
  createAssessment,
  createInvitations,
  createQuestionBankItem,
  deleteAssessment,
  deleteQuestionBankItem,
  duplicateAssessment,
  generateDraftQuestions,
  getAssessmentById,
  getAssessmentIntegrity,
  getAssessmentResumeSignedUrl,
  getAssessmentResultById,
  getAssessmentResults,
  getAssessments,
  getInvitations,
  getQuestionBank,
  publishAssessment,
  resendInvitation,
  reviewAssessmentResult,
  streamAssessmentResume,
  updateAssessment,
  updateAssessmentStatus,
  updateQuestionBankItem,
} from "../controllers/recruiterAssessmentsController.js";
import { authenticate, requireRecruiter } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import {
  assessmentQuerySchema,
  assessmentResultQuerySchema,
  assessmentSchema,
  assessmentStatusSchema,
  generateAssessmentQuestionsSchema,
  invitationCreateSchema,
  invitationQuerySchema,
  questionBankSchema,
  resultReviewSchema,
  resultScoreAdjustmentSchema,
} from "../validations/assessmentSchemas.js";

const router = Router();

router.use(authenticate, requireRecruiter);

router.get("/assessments", validate(assessmentQuerySchema, "query"), getAssessments);
router.post("/assessments", validate(assessmentSchema), createAssessment);
router.get("/assessments/:assessmentId", getAssessmentById);
router.put("/assessments/:assessmentId", validate(assessmentSchema), updateAssessment);
router.delete("/assessments/:assessmentId", deleteAssessment);
router.patch("/assessments/:assessmentId/status", validate(assessmentStatusSchema), updateAssessmentStatus);
router.post("/assessments/:assessmentId/duplicate", duplicateAssessment);
router.post("/assessments/:assessmentId/publish", publishAssessment);
router.post("/assessments/generate-questions", aiRateLimiter, validate(generateAssessmentQuestionsSchema), generateDraftQuestions);

router.get("/question-bank", getQuestionBank);
router.post("/question-bank", validate(questionBankSchema), createQuestionBankItem);
router.put("/question-bank/:questionId", validate(questionBankSchema), updateQuestionBankItem);
router.delete("/question-bank/:questionId", deleteQuestionBankItem);

router.post("/assessment-invitations", validate(invitationCreateSchema), createInvitations);
router.get("/assessment-invitations", validate(invitationQuerySchema, "query"), getInvitations);
router.patch("/assessment-invitations/:invitationId/cancel", cancelInvitation);
router.post("/assessment-invitations/:invitationId/resend", resendInvitation);

router.get("/assessment-results", validate(assessmentResultQuerySchema, "query"), getAssessmentResults);
router.get("/assessment-results/:attemptId", getAssessmentResultById);
router.get("/assessment-results/:attemptId/identity-report", getRecruiterIdentityReport);
router.patch("/assessment-results/:attemptId/identity-report/review", reviewRecruiterIdentityReport);
router.post("/assessment-results/:attemptId/identity-report/request-retest", requestIdentityRetest);
router.post("/assessment-results/:attemptId/identity-report/request-explanation", requestCandidateExplanation);
router.get("/identity-verification/image/:token", streamSignedIdentityImage);
router.get("/assessment-results/:attemptId/resume/signed-url", getAssessmentResumeSignedUrl);
router.get("/assessment-results/:attemptId/resume/file", streamAssessmentResume);
router.patch("/assessment-results/:attemptId/review", validate(resultReviewSchema), reviewAssessmentResult);
router.patch("/assessment-results/:attemptId/score", validate(resultScoreAdjustmentSchema), adjustAssessmentScore);
router.get("/assessment-results/:attemptId/integrity", getAssessmentIntegrity);

export default router;
