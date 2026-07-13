import fs from "fs";
import path from "path";
import { Resume } from "../models/Resume.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getResumeStorageDir, resolveStoredResumePath } from "../utils/resumeStorage.js";

function mapResumeSecurityRecord(resume) {
  return {
    id: resume._id,
    candidateId: resume.candidateId,
    originalName: resume.originalName,
    fileSize: resume.fileSize,
    mimeType: resume.mimeType,
    fileHash: resume.fileHash,
    storageZone: resume.storageZone,
    securityStatus: resume.securityStatus,
    confirmationStatus: resume.confirmationStatus,
    rejectedReasonCode: resume.rejectedReasonCode,
    uploadChecks: resume.uploadChecks,
    uploadWarnings: resume.uploadWarnings,
    latestSecurityEvent: resume.securityEvents?.at?.(-1) || null,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  };
}

export const getResumeSecurityReview = asyncHandler(async (_req, res) => {
  const [
    rejectedResumes,
    malwareScanFailures,
    parserFailures,
    recentRecruiterAccess,
    highUploadVolumeAccounts,
  ] = await Promise.all([
    Resume.find({ $or: [{ securityStatus: "REJECTED" }, { storageZone: "rejected" }] }).sort({ updatedAt: -1 }).limit(50),
    Resume.find({ "uploadChecks.suspiciousContentDetected": true }).sort({ updatedAt: -1 }).limit(50),
    Resume.find({ analysisStatus: "Analysis Failed" }).sort({ updatedAt: -1 }).limit(50),
    Resume.find({ "accessLog.actorRole": "recruiter" }).sort({ updatedAt: -1 }).limit(50),
    Resume.aggregate([
      {
        $group: {
          _id: "$candidateId",
          uploads: { $sum: 1 },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["$securityStatus", "REJECTED"] }, 1, 0],
            },
          },
          latestUpload: { $max: "$createdAt" },
        },
      },
      { $match: { uploads: { $gte: 5 } } },
      { $sort: { uploads: -1, latestUpload: -1 } },
      { $limit: 25 },
    ]),
  ]);

  res.json({
    rejectedResumes: rejectedResumes.map(mapResumeSecurityRecord),
    malwareScanFailures: malwareScanFailures.map(mapResumeSecurityRecord),
    parserFailures: parserFailures.map(mapResumeSecurityRecord),
    recentRecruiterAccess: recentRecruiterAccess.map((resume) => ({
      ...mapResumeSecurityRecord(resume),
      accessLog: (resume.accessLog || []).filter((event) => event.actorRole === "recruiter").slice(-10),
    })),
    highUploadVolumeAccounts,
  });
});

export const deleteRejectedResumeFile = asyncHandler(async (req, res) => {
  const resume = await Resume.findById(req.params.resumeId);
  if (!resume) {
    throw new ApiError(404, "Resume not found");
  }

  if (resume.storageZone !== "rejected" && resume.securityStatus !== "REJECTED") {
    throw new ApiError(400, "Only rejected resume files can be deleted from this action.");
  }

  const storedPath = resolveStoredResumePath(resume.resumeUrl);
  const rejectedPath = resume.rejectedFileKey ? path.join(getResumeStorageDir("rejected"), path.basename(resume.rejectedFileKey)) : "";
  for (const filePath of [storedPath, rejectedPath]) {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  resume.securityEvents.push({
    eventType: "Rejected file deleted by admin",
    status: "DELETED",
    reasonCode: "ADMIN_DELETE_REJECTED_FILE",
    createdAt: new Date(),
  });
  resume.storageZone = "rejected";
  await resume.save();

  res.json({ message: "Rejected resume file deleted." });
});
