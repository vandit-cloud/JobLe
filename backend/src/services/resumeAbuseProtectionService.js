import { Resume } from "../models/Resume.js";
import { ApiError } from "../utils/apiError.js";

const MAX_FAILED_UPLOADS_PER_IP_PER_DAY = 20;
const MAX_ACTIVE_PROCESSING_JOBS_PER_CANDIDATE = 2;
const MAX_TOTAL_STORAGE_BYTES_PER_CANDIDATE = 25 * 1024 * 1024;
const failedUploadMap = new Map();
const activeJobs = new Map();

function keyForIp(ip) {
  const day = new Date().toISOString().slice(0, 10);
  return `${ip || "unknown"}:${day}`;
}

export function assertFailedUploadLimit(ip) {
  const key = keyForIp(ip);
  const count = failedUploadMap.get(key) || 0;
  if (count >= MAX_FAILED_UPLOADS_PER_IP_PER_DAY) {
    throw new ApiError(429, "Too many failed resume uploads. Please try again later.", {
      code: "RESUME_UPLOAD_LIMIT_REACHED",
    });
  }
}

export function recordFailedResumeUpload(ip) {
  const key = keyForIp(ip);
  failedUploadMap.set(key, (failedUploadMap.get(key) || 0) + 1);
}

export async function assertCandidateStorageLimit(candidateId, incomingFileSize = 0) {
  const [summary] = await Resume.aggregate([
    { $match: { candidateId } },
    { $group: { _id: "$candidateId", totalStorage: { $sum: "$fileSize" } } },
  ]);

  if ((summary?.totalStorage || 0) + incomingFileSize > MAX_TOTAL_STORAGE_BYTES_PER_CANDIDATE) {
    throw new ApiError(429, "Resume storage limit reached. Delete an older resume before uploading a new one.", {
      code: "RESUME_STORAGE_LIMIT_REACHED",
    });
  }
}

export async function runCandidateResumeProcessingJob(candidateId, task) {
  const key = String(candidateId || "unknown");
  const current = activeJobs.get(key) || 0;
  if (current >= MAX_ACTIVE_PROCESSING_JOBS_PER_CANDIDATE) {
    throw new ApiError(429, "Too many active resume-processing jobs. Please wait for the current processing to finish.", {
      code: "RESUME_PROCESSING_LIMIT_REACHED",
    });
  }

  activeJobs.set(key, current + 1);
  try {
    return await task();
  } finally {
    const next = Math.max((activeJobs.get(key) || 1) - 1, 0);
    if (next === 0) {
      activeJobs.delete(key);
    } else {
      activeJobs.set(key, next);
    }
  }
}
