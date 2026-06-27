import { Router } from "express";
import { getPublicPlans } from "../controllers/publicSubscriptionController.js";
import { getPublicCompanyById, getPublicCompanyJobs, getPublicJobById, getPublicJobs } from "../controllers/publicPortalController.js";

const router = Router();

router.get("/subscription-plans", getPublicPlans);
router.get("/jobs", getPublicJobs);
router.get("/jobs/:jobId", getPublicJobById);
router.get("/companies/:companyId", getPublicCompanyById);
router.get("/companies/:companyId/jobs", getPublicCompanyJobs);

export default router;
