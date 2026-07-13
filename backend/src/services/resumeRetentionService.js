import fs from "fs/promises";
import path from "path";
import { Resume } from "../models/Resume.js";
import { getResumeStorageDir } from "../utils/resumeStorage.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REJECTED_RETENTION_MS = 30 * ONE_DAY_MS;
const QUARANTINE_RETENTION_MS = ONE_DAY_MS;

async function removeFileIfPresent(filePath) {
  if (!filePath) return;
  await fs.rm(filePath, { force: true }).catch(() => {});
}

export async function cleanupExpiredResumeFiles(now = new Date()) {
  const rejectedBefore = new Date(now.getTime() - REJECTED_RETENTION_MS);
  const quarantineBefore = new Date(now.getTime() - QUARANTINE_RETENTION_MS);

  const rejectedResumes = await Resume.find({
    storageZone: "rejected",
    updatedAt: { $lte: rejectedBefore },
  }).select("rejectedFileKey resumeUrl securityEvents");

  for (const resume of rejectedResumes) {
    const filename = path.basename(resume.rejectedFileKey || resume.resumeUrl || "");
    await removeFileIfPresent(filename ? path.join(getResumeStorageDir("rejected"), filename) : "");
    resume.securityEvents.push({
      eventType: "Rejected resume retention cleanup",
      status: "DELETED",
      reasonCode: "REJECTED_RETENTION_EXPIRED",
      createdAt: now,
    });
    await resume.save();
  }

  const staleQuarantineResumes = await Resume.find({
    storageZone: "quarantine",
    updatedAt: { $lte: quarantineBefore },
  }).select("quarantineFileKey securityEvents");

  for (const resume of staleQuarantineResumes) {
    const filename = path.basename(resume.quarantineFileKey || "");
    await removeFileIfPresent(filename ? path.join(getResumeStorageDir("quarantine"), filename) : "");
    resume.securityEvents.push({
      eventType: "Quarantine retention cleanup",
      status: "DELETED",
      reasonCode: "QUARANTINE_RETENTION_EXPIRED",
      createdAt: now,
    });
    await resume.save();
  }
}

export function scheduleResumeRetentionCleanup() {
  cleanupExpiredResumeFiles().catch(() => {});
  setInterval(() => {
    cleanupExpiredResumeFiles().catch(() => {});
  }, ONE_DAY_MS).unref();
}
