import { Router } from "express";
import { getCurrentUser, loginCandidate, loginRecruiter, registerCandidate, registerRecruiter } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { candidateLoginSchema, candidateRegisterSchema, recruiterLoginSchema, recruiterRegisterSchema } from "../validations/authSchemas.js";

const router = Router();

router.post("/recruiter/register", validate(recruiterRegisterSchema), registerRecruiter);
router.post("/recruiter/login", validate(recruiterLoginSchema), loginRecruiter);
router.post("/candidate/register", validate(candidateRegisterSchema), registerCandidate);
router.post("/candidate/login", validate(candidateLoginSchema), loginCandidate);
router.get("/me", authenticate, getCurrentUser);

export default router;
