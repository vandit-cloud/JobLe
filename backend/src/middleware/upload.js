import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";

const storageDir = path.resolve(process.cwd(), "backend", "storage", "logos");
fs.mkdirSync(storageDir, { recursive: true });
const resumeDir = path.resolve(process.cwd(), "backend", "storage", "resume-quarantine");
fs.mkdirSync(resumeDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storageDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, resumeDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    cb(null, `resume_${crypto.randomUUID()}${extension}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.mimetype)) {
    cb(new ApiError(400, "Unsupported file type"));
    return;
  }
  cb(null, true);
}

export const uploadLogo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
  },
});

function resumeFileFilter(_req, file, cb) {
  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowed.includes(file.mimetype)) {
    cb(new ApiError(400, "Please upload a PDF or DOCX resume."));
    return;
  }
  cb(null, true);
}

export const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
  },
});
