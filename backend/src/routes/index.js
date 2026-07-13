import { Router } from "express";
import adminRoutes from "./adminRoutes.js";
import authRoutes from "./authRoutes.js";
import candidateRoutes from "./candidateRoutes.js";
import publicRoutes from "./publicRoutes.js";
import recruiterRoutes from "./recruiterRoutes.js";
import recruiterAssessmentRoutes from "./recruiterAssessmentRoutes.js";
import recruiterSubscriptionRoutes from "./recruiterSubscriptionRoutes.js";
import resumeAccessRoutes from "./resumeAccessRoutes.js";
import webhookRoutes from "./webhookRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/public", publicRoutes);
router.use("/recruiter", recruiterRoutes);
router.use("/recruiter", recruiterAssessmentRoutes);
router.use("/recruiter", recruiterSubscriptionRoutes);
router.use("/candidate", candidateRoutes);
router.use("/resume-access", resumeAccessRoutes);
router.use("/webhooks", webhookRoutes);

export default router;
