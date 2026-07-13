import fs from "fs";
import path from "path";
import { CandidateIdentityVerification } from "../models/CandidateIdentityVerification.js";
import { IdentityVerificationEvent } from "../models/IdentityVerificationEvent.js";
import { getSkillVerificationStorageRoot } from "../utils/skillVerificationStorage.js";

function deleteStoredKey(fileKey) {
  if (!fileKey) return;
  const root = getSkillVerificationStorageRoot();
  const filePath = path.resolve(root, fileKey);
  if (filePath.startsWith(root) && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function runIdentityVerificationRetentionCleanup() {
  const expired = await CandidateIdentityVerification.find({ expiresAt: { $lte: new Date() } }).limit(100);
  for (const verification of expired) {
    deleteStoredKey(verification.referenceImages?.front?.key);
    deleteStoredKey(verification.referenceImages?.left?.key);
    deleteStoredKey(verification.referenceImages?.right?.key);
    verification.referenceImages = { front: null, left: null, right: null };
    verification.status = verification.status === "VERIFIED" ? "MANUAL_REVIEW_REQUIRED" : verification.status;
    verification.reviewStatus = verification.reviewStatus || "Unreviewed";
    await verification.save();
  }

  await IdentityVerificationEvent.deleteMany({ createdAt: { $lte: new Date(Date.now() - 90 * 86400000) } });
}

export function scheduleIdentityVerificationRetentionCleanup() {
  runIdentityVerificationRetentionCleanup().catch(console.error);
  setInterval(() => {
    runIdentityVerificationRetentionCleanup().catch(console.error);
  }, 24 * 60 * 60 * 1000);
}
