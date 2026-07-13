import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const aiRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many AI requests. Please try again shortly.",
  },
});

export const resumeUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?.candidateId || req.params?.invitationToken || req.ip),
  message: {
    code: "RESUME_UPLOAD_LIMIT_REACHED",
    message: "Too many resume uploads. Please try again later.",
  },
});
