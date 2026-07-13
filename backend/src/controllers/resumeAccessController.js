import fs from "fs";
import { Resume } from "../models/Resume.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyResumeAccessToken } from "../utils/resumeAccessToken.js";
import { resolveStoredResumePath } from "../utils/resumeStorage.js";

export const streamSignedResume = asyncHandler(async (req, res) => {
  const payload = verifyResumeAccessToken(req.params.token);
  if (!payload) {
    throw new ApiError(403, "Resume link is invalid or expired.");
  }

  const resume = await Resume.findById(payload.resumeId);
  if (!resume || resume.securityStatus !== "CLEAN" || resume.confirmationStatus !== "CONFIRMED" || resume.storageZone !== "clean") {
    throw new ApiError(403, "Resume link is invalid or expired.");
  }

  const absolutePath = resolveStoredResumePath(resume.resumeUrl);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    throw new ApiError(404, "Resume file not found");
  }

  resume.accessLog.push({
    actorRole: payload.actorRole || "recruiter",
    actorId: String(payload.actorId || ""),
    action: "signed_resume_viewed",
    ipAddress: String(req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""),
    reasonCode: payload.reasonCode || "SIGNED_URL",
    accessedAt: new Date(),
  });
  resume.securityEvents.push({
    eventType: "Resume downloaded",
    status: resume.securityStatus,
    reasonCode: payload.reasonCode || "SIGNED_URL",
    createdAt: new Date(),
  });
  await resume.save();

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("Cache-Control", "private, max-age=0, no-store");
  res.sendFile(absolutePath);
});
