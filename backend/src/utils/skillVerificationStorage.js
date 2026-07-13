import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ApiError } from "./apiError.js";

const verificationRoot = path.resolve(process.cwd(), "backend", "storage", "skill-verification");
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const REQUIRED_SIGNATURE_LENGTH = 64;

fs.mkdirSync(verificationRoot, { recursive: true });

export function getSkillVerificationStorageRoot() {
  return verificationRoot;
}

function safeCandidateDir(candidateId) {
  return String(candidateId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!match) {
    throw new ApiError(400, "Verification image must be a camera JPEG, PNG, or WEBP data URL.");
  }

  const mimeType = match[1];
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ApiError(400, "Unsupported verification image type.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new ApiError(400, "Verification image is too large or empty.");
  }

  return { mimeType, buffer };
}

function normalizeSignature(signature) {
  if (!Array.isArray(signature) || signature.length !== REQUIRED_SIGNATURE_LENGTH) {
    throw new ApiError(400, "Verification image signature is missing or invalid.");
  }

  return signature.map((value) => (Number(value) ? 1 : 0));
}

function scoreImageQuality(metrics = {}) {
  const brightness = Number(metrics.brightness || 0);
  const contrast = Number(metrics.contrast || 0);
  const brightnessScore = brightness >= 55 && brightness <= 210 ? 45 : 20;
  const contrastScore = contrast >= 18 ? 35 : 15;
  const sharpnessScore = Number(metrics.edgeScore || 0) >= 8 ? 20 : 10;
  return Math.min(100, brightnessScore + contrastScore + sharpnessScore);
}

function imageDecision({ qualityScore, angle, metrics = {} }) {
  const issues = [];
  if (metrics.cameraCovered) issues.push("Camera may be covered or the frame is too dark to review.");
  if (metrics.frozenFrame) issues.push("Camera frame appears frozen or unchanged during monitoring.");
  if (metrics.faceVisible === false) issues.push("Candidate face is not clearly visible.");
  if (metrics.onlyOneFaceVisible === false) issues.push("Multiple-person or unclear-face review is required.");
  if (qualityScore < 65) issues.push("Image quality is low. Use better lighting and keep your face clear.");
  if (Number(metrics.brightness || 0) < 45) issues.push("Image appears too dark.");
  if (Number(metrics.brightness || 0) > 225) issues.push("Image appears overexposed.");
  if (Number(metrics.contrast || 0) < 12) issues.push("Image appears blurry or low contrast.");
  if (!["front", "left", "right", "during-test"].includes(angle)) issues.push("Unknown verification angle.");

  return {
    aiDecision: issues.length ? "Review Required" : "Passed",
    livenessScore: Math.max(0, Math.min(100, qualityScore - issues.length * 10)),
    issues,
  };
}

function hammingDistance(left = [], right = []) {
  const length = Math.min(left.length, right.length);
  let distance = 0;
  for (let index = 0; index < length; index += 1) {
    if (Number(left[index]) !== Number(right[index])) distance += 1;
  }
  return distance + Math.abs(left.length - right.length);
}

export function saveVerificationImage({ candidateId, angle, imageData, signature, metrics = {}, prefix = "baseline" }) {
  const { mimeType, buffer } = parseDataUrl(imageData);
  const normalizedSignature = normalizeSignature(signature);
  const extension = mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
  const candidateDir = path.join(verificationRoot, safeCandidateDir(candidateId));
  fs.mkdirSync(candidateDir, { recursive: true });

  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const filename = `${prefix}_${angle}_${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(candidateDir, filename);
  fs.writeFileSync(absolutePath, buffer);

  const qualityScore = scoreImageQuality(metrics);
  const decision = imageDecision({ qualityScore, angle, metrics });

  return {
    angle,
    fileKey: path.join(safeCandidateDir(candidateId), filename).replace(/\\/g, "/"),
    fileHash,
    mimeType,
    size: buffer.length,
    signature: normalizedSignature,
    qualityScore,
    livenessScore: decision.livenessScore,
    aiDecision: decision.aiDecision,
    issues: decision.issues,
    capturedAt: new Date(),
  };
}

export function compareVerificationImage({ candidateId, imageData, signature, metrics = {}, baselinePhotos = [] }) {
  const current = saveVerificationImage({
    candidateId,
    angle: "during-test",
    imageData,
    signature,
    metrics,
    prefix: "check",
  });

  const candidates = baselinePhotos.filter((photo) => Array.isArray(photo.signature) && photo.signature.length === REQUIRED_SIGNATURE_LENGTH);
  const scored = candidates
    .map((photo) => {
      const distance = hammingDistance(current.signature, photo.signature);
      return {
        angle: photo.angle,
        distance,
        confidence: Math.max(0, Math.round(100 - (distance / REQUIRED_SIGNATURE_LENGTH) * 100)),
      };
    })
    .sort((left, right) => right.confidence - left.confidence);

  const best = scored[0] || { angle: "", confidence: 0, distance: REQUIRED_SIGNATURE_LENGTH };
  const issues = [...(current.issues || [])];
  if (best.confidence < 58) {
    issues.push("Live camera image does not confidently match the stored verification photos.");
  }

  return {
    status: issues.length ? "Review Required" : "Passed",
    confidence: best.confidence,
    matchedAngle: best.angle,
    fileKey: current.fileKey,
    fileHash: current.fileHash,
    signature: current.signature,
    issues,
    checkedAt: new Date(),
  };
}
