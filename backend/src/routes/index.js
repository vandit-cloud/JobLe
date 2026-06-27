import { Router } from "express";
import authRoutes from "./authRoutes.js";
import candidateRoutes from "./candidateRoutes.js";
import publicRoutes from "./publicRoutes.js";
import recruiterRoutes from "./recruiterRoutes.js";
import recruiterAssessmentRoutes from "./recruiterAssessmentRoutes.js";
import recruiterSubscriptionRoutes from "./recruiterSubscriptionRoutes.js";
import webhookRoutes from "./webhookRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/public", publicRoutes);
router.use("/recruiter", recruiterRoutes);
router.use("/recruiter", recruiterAssessmentRoutes);
router.use("/recruiter", recruiterSubscriptionRoutes);
router.use("/candidate", candidateRoutes);
router.use("/webhooks", webhookRoutes);

export default router;
