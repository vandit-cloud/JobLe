import path from "path";
import fs from "fs";

const resumeStorageRoot = path.resolve(process.cwd(), "backend", "storage");
const resumeStorageDirs = {
  quarantine: path.join(resumeStorageRoot, "resume-quarantine"),
  clean: path.join(resumeStorageRoot, "resume-clean"),
  rejected: path.join(resumeStorageRoot, "resume-rejected"),
  legacy: path.join(resumeStorageRoot, "resumes"),
};

for (const directory of Object.values(resumeStorageDirs)) {
  fs.mkdirSync(directory, { recursive: true });
}

const RESUME_URL_PREFIX_BY_ZONE = {
  clean: "/uploads/resumes-clean/",
  quarantine: "/internal/resume-quarantine/",
  rejected: "/internal/resume-rejected/",
  legacy: "/uploads/resumes/",
};

export function isStoredResumePath(resumeUrl) {
  return (
    typeof resumeUrl === "string" &&
    Object.values(RESUME_URL_PREFIX_BY_ZONE).some((prefix) => resumeUrl.startsWith(prefix))
  );
}

export function resolveStoredResumePath(resumeUrl) {
  if (!isStoredResumePath(resumeUrl)) {
    return null;
  }

  const filename = path.basename(resumeUrl);
  const matchedZone = Object.entries(RESUME_URL_PREFIX_BY_ZONE).find(([, prefix]) => resumeUrl.startsWith(prefix))?.[0] || "legacy";
  const baseDirectory = resumeStorageDirs[matchedZone] || resumeStorageDirs.legacy;
  const absolutePath = path.resolve(baseDirectory, filename);

  if (!absolutePath.startsWith(baseDirectory)) {
    return null;
  }

  return absolutePath;
}

export function buildResumeStorageUrl(zone, filename) {
  const prefix = RESUME_URL_PREFIX_BY_ZONE[zone];
  if (!prefix) {
    return "";
  }
  return `${prefix}${path.basename(filename)}`;
}

export function getResumeStorageDir(zone = "clean") {
  return resumeStorageDirs[zone] || resumeStorageDirs.clean;
}

export function getResumeStorageDirs() {
  return { ...resumeStorageDirs };
}
