import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const RESUME_ACCESS_EXPIRY_SECONDS = 5 * 60;

export function createResumeAccessToken(payload) {
  return jwt.sign(
    {
      ...payload,
      purpose: "resume_access",
    },
    env.jwtSecret,
    {
      expiresIn: RESUME_ACCESS_EXPIRY_SECONDS,
    },
  );
}

export function verifyResumeAccessToken(token) {
  const payload = jwt.verify(token, env.jwtSecret);
  if (payload?.purpose !== "resume_access" || !payload?.resumeId) {
    return null;
  }
  return payload;
}

export function buildSignedResumeUrl(req, token) {
  return `${req.protocol}://${req.get("host")}/api/resume-access/${encodeURIComponent(token)}`;
}
