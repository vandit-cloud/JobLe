import { Router } from "express";
import {
  getAdminAlternativeVerificationRequests,
  getAdminIdentityVerificationEvents,
  reviewAdminAlternativeVerificationRequest,
} from "../controllers/adminIdentityVerificationController.js";
import { deleteRejectedResumeFile, getResumeSecurityReview } from "../controllers/adminResumeSecurityController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/resume-security", getResumeSecurityReview);
router.delete("/resume-security/:resumeId/rejected-file", deleteRejectedResumeFile);
router.get("/identity-verification/events", getAdminIdentityVerificationEvents);
router.get("/identity-verification/alternative-requests", getAdminAlternativeVerificationRequests);
router.patch("/identity-verification/alternative-requests/:requestId/review", reviewAdminAlternativeVerificationRequest);

export default router;
