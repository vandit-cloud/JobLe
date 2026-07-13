import { Router } from "express";
import { deleteRejectedResumeFile, getResumeSecurityReview } from "../controllers/adminResumeSecurityController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/resume-security", getResumeSecurityReview);
router.delete("/resume-security/:resumeId/rejected-file", deleteRejectedResumeFile);

export default router;
