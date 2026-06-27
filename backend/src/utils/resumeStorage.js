import path from "path";

const resumeStorageDir = path.resolve(process.cwd(), "backend", "storage", "resumes");

export function isStoredResumePath(resumeUrl) {
  return typeof resumeUrl === "string" && resumeUrl.startsWith("/uploads/resumes/");
}

export function resolveStoredResumePath(resumeUrl) {
  if (!isStoredResumePath(resumeUrl)) {
    return null;
  }

  const filename = path.basename(resumeUrl);
  const absolutePath = path.resolve(resumeStorageDir, filename);

  if (!absolutePath.startsWith(resumeStorageDir)) {
    return null;
  }

  return absolutePath;
}

export function getResumeStorageDir() {
  return resumeStorageDir;
}
