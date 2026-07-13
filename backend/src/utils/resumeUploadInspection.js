import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_RESUME_PAGES = 10;
export const MAX_EXTRACTED_TEXT_LENGTH = 100000;

const ALLOWED_EXTENSION_BY_MIME = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

const BLOCKED_EXTENSIONS = new Set([".doc", ".docm", ".exe", ".js", ".html", ".svg", ".zip", ".rar", ".php", ".jar", ".apk"]);
const PDF_SIGNATURE = "%PDF-";
const ZIP_SIGNATURES = ["504b0304", "504b0506", "504b0708"];
const SUSPICIOUS_PDF_PATTERNS = [
  /\/JavaScript\b/i,
  /\/JS\b/i,
  /\/OpenAction\b/i,
  /\/AA\b/i,
  /\/Launch\b/i,
  /\/EmbeddedFile\b/i,
  /\/RichMedia\b/i,
  /\/SubmitForm\b/i,
  /\/XFA\b/i,
];
const SUSPICIOUS_DOCX_PATTERNS = [
  /vbaProject\.bin/i,
  /word\/vbaData\.xml/i,
  /macrosheets\//i,
  /activeX\//i,
  /embeddings\//i,
  /oleObject/i,
  /attachedTemplate/i,
  /TargetMode="External"/i,
  /https?:\/\//i,
  /file:\/\//i,
];

function buildSecurityEvent({ eventType, status, reasonCode = "", message = "", details = {} }) {
  return {
    eventType,
    status,
    reasonCode,
    message,
    details,
    createdAt: new Date(),
  };
}

function hasSafeFilename(filename = "") {
  const base = path.basename(filename);
  return Boolean(base) && base.length <= 160 && !/[<>:"/\\|?*\u0000-\u001f]/.test(base) && base === filename;
}

function detectMagicType(buffer) {
  const firstBytes = buffer.subarray(0, 8);
  const ascii = firstBytes.toString("ascii");
  const hex = firstBytes.toString("hex").toLowerCase();

  if (ascii.startsWith(PDF_SIGNATURE)) {
    return "application/pdf";
  }

  if (ZIP_SIGNATURES.some((signature) => hex.startsWith(signature))) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "unknown";
}

function scanPdf(buffer) {
  const text = buffer.toString("latin1");
  const detectedPatterns = SUSPICIOUS_PDF_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  return {
    suspicious: detectedPatterns.length > 0,
    reasonCode: detectedPatterns.length > 0 ? "SUSPICIOUS_PDF_ACTIONS" : "",
    findings: detectedPatterns,
  };
}

function scanDocx(buffer) {
  const latinText = buffer.toString("latin1");
  const utf8Text = buffer.toString("utf8");
  const combined = `${latinText}\n${utf8Text}`;
  const detectedPatterns = SUSPICIOUS_DOCX_PATTERNS.filter((pattern) => pattern.test(combined)).map((pattern) => pattern.source);
  const centralDirectoryEntryCount = (latinText.match(/PK\x01\x02/g) || []).length;
  const looksLikeDocx = /word\/document\.xml/i.test(combined) && /\[Content_Types\]\.xml/i.test(combined);

  if (centralDirectoryEntryCount > 500) {
    detectedPatterns.push("ZIP_ENTRY_COUNT_LIMIT");
  }

  return {
    suspicious: detectedPatterns.length > 0,
    reasonCode: detectedPatterns.length > 0 ? "SUSPICIOUS_DOCX_CONTENT" : "",
    findings: detectedPatterns,
    internalFileCount: centralDirectoryEntryCount || null,
    looksLikeDocx,
  };
}

async function inspectPdf(buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo({ parsePageInfo: false });
    const pageCount = Number(info?.total || 0) || null;

    return {
      pageCount,
      passwordProtectedPdf: false,
      corruptedFile: false,
      pageCountExceeded: Boolean(pageCount && pageCount > MAX_RESUME_PAGES),
      warnings:
        pageCount && pageCount > MAX_RESUME_PAGES
          ? [`This resume has ${pageCount} pages. Please keep resumes under ${MAX_RESUME_PAGES} pages.`]
          : [],
    };
  } catch (error) {
    const message = String(error?.message || error || "");

    if (/password/i.test(message)) {
      return {
        pageCount: null,
        passwordProtectedPdf: true,
        corruptedFile: false,
        pageCountExceeded: false,
        warnings: [],
      };
    }

    return {
      pageCount: null,
      passwordProtectedPdf: false,
      corruptedFile: true,
      pageCountExceeded: false,
      warnings: [],
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function inspectDocx(buffer) {
  try {
    await mammoth.extractRawText({ buffer });
    return {
      pageCount: null,
      passwordProtectedPdf: false,
      corruptedFile: false,
      pageCountExceeded: false,
      warnings: [],
    };
  } catch (_error) {
    return {
      pageCount: null,
      passwordProtectedPdf: false,
      corruptedFile: true,
      pageCountExceeded: false,
      warnings: [],
    };
  }
}

export async function inspectResumeUpload({ filePath, filename, mimeType }) {
  const extension = path.extname(filename || filePath).toLowerCase();
  const allowedExtensions = ALLOWED_EXTENSION_BY_MIME[mimeType] || [];
  const extensionValid = allowedExtensions.includes(extension);
  const buffer = await fs.readFile(filePath);
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const magicMimeType = detectMagicType(buffer);
  const magicBytesValid = magicMimeType === mimeType;
  const blockedExtension = BLOCKED_EXTENSIONS.has(extension);
  const fileSizeValid = buffer.length <= MAX_RESUME_FILE_SIZE_BYTES;
  const filenameSafe = hasSafeFilename(filename || "");
  const securityEvents = [
    buildSecurityEvent({
      eventType: "Resume uploaded",
      status: "QUARANTINED",
      reasonCode: "UPLOAD_RECEIVED",
      details: {
        fileSize: buffer.length,
        detectedMimeType: magicMimeType,
        hash: fileHash,
      },
    }),
    buildSecurityEvent({
      eventType: "Malware scan started",
      status: "SCANNING",
      reasonCode: "LOCAL_STATIC_SCAN",
    }),
  ];

  let details = {
    pageCount: null,
    passwordProtectedPdf: false,
    corruptedFile: false,
    pageCountExceeded: false,
    warnings: [],
  };
  let malwareScan = {
    suspicious: false,
    reasonCode: "",
    findings: [],
    internalFileCount: null,
    looksLikeDocx: true,
  };

  if (mimeType === "application/pdf" || extension === ".pdf") {
    malwareScan = scanPdf(buffer);
    details = await inspectPdf(buffer);
  } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || extension === ".docx") {
    malwareScan = scanDocx(buffer);
    details = await inspectDocx(buffer);
  }

  const hardFailures = [];
  if (!fileSizeValid) hardFailures.push("FILE_SIZE_LIMIT_EXCEEDED");
  if (blockedExtension) hardFailures.push("BLOCKED_EXTENSION");
  if (!extensionValid) hardFailures.push("EXTENSION_MISMATCH");
  if (!ALLOWED_EXTENSION_BY_MIME[mimeType]) hardFailures.push("MIME_TYPE_NOT_ALLOWED");
  if (!magicBytesValid) hardFailures.push("MAGIC_BYTES_MISMATCH");
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && !malwareScan.looksLikeDocx) {
    hardFailures.push("INVALID_DOCX_STRUCTURE");
  }
  if (!filenameSafe) hardFailures.push("UNSAFE_FILENAME");
  if (details.passwordProtectedPdf) hardFailures.push("PASSWORD_PROTECTED_PDF");
  if (details.corruptedFile) hardFailures.push("CORRUPTED_DOCUMENT");
  if (details.pageCountExceeded) hardFailures.push("PAGE_COUNT_LIMIT_EXCEEDED");
  if (malwareScan.suspicious) hardFailures.push(malwareScan.reasonCode || "SUSPICIOUS_CONTENT");

  if (hardFailures.length > 0) {
    securityEvents.push(
      buildSecurityEvent({
        eventType: malwareScan.suspicious ? "Malware detected" : "File validation failed",
        status: "REJECTED",
        reasonCode: hardFailures[0],
        message: "This file failed our security checks. Please upload a new PDF or DOCX resume.",
        details: {
          failures: hardFailures,
          findings: malwareScan.findings,
        },
      }),
    );
  } else {
    securityEvents.push(
      buildSecurityEvent({
        eventType: "Resume marked clean",
        status: "CLEAN",
        reasonCode: "SECURITY_CHECKS_PASSED",
        details: {
          internalFileCount: malwareScan.internalFileCount,
        },
      }),
    );
  }

  return {
    fileHash,
    pageCount: details.pageCount,
    warnings: details.warnings,
    rejected: hardFailures.length > 0,
    rejectionReasonCode: hardFailures[0] || "",
    rejectionMessage: hardFailures.length > 0 ? "This file failed our security checks. Please upload a new PDF or DOCX resume." : "",
    securityEvents,
    scanFindings: malwareScan.findings,
    uploadChecks: {
      mimeTypeValid: Boolean(ALLOWED_EXTENSION_BY_MIME[mimeType]),
      extensionValid,
      blockedExtension,
      magicBytesValid,
      fileSizeValid,
      filenameSafe,
      duplicateDetected: false,
      passwordProtectedPdf: details.passwordProtectedPdf,
      corruptedFile: details.corruptedFile,
      malwareScanStatus: malwareScan.suspicious ? "Rejected" : "Passed",
      suspiciousContentDetected: malwareScan.suspicious,
      pageCountWarning: Boolean(details.pageCount && details.pageCount > MAX_RESUME_PAGES),
      extractedTextAvailable: null,
    },
  };
}
