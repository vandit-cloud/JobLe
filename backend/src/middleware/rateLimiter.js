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

