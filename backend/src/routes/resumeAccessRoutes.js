import { Router } from "express";
import { streamSignedResume } from "../controllers/resumeAccessController.js";

const router = Router();

router.get("/:token", streamSignedResume);

export default router;
