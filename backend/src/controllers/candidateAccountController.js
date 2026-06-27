import bcrypt from "bcryptjs";
import { Application } from "../models/Application.js";
import { AssessmentAttempt } from "../models/AssessmentAttempt.js";
import { Candidate } from "../models/Candidate.js";
import { CandidatePrivacySettings } from "../models/CandidatePrivacySettings.js";
import { Interview } from "../models/Interview.js";
import { Notification } from "../models/Notification.js";
import { Resume } from "../models/Resume.js";
import { User } from "../models/User.js";
import {
  getActiveUserSessions,
  revokeAllOtherUserSessions,
  revokeAllUserSessions,
  revokeUserSession,
} from "../services/sessionService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function getCurrentUserWithPassword(req) {
  const user = await User.findById(req.user.userId).select("+passwordHash");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
}

export const exportCandidateData = asyncHandler(async (req, res) => {
  const [candidate, resumes, applications, attempts, interviews, notifications, privacy] = await Promise.all([
    Candidate.findById(req.user.candidateId),
    Resume.find({ candidateId: req.user.candidateId }).sort({ uploadedAt: -1 }),
    Application.find({ candidateId: req.user.candidateId }).sort({ updatedAt: -1 }),
    AssessmentAttempt.find({ candidateId: req.user.candidateId }).sort({ createdAt: -1 }),
    Interview.find({ candidateId: req.user.candidateId }).sort({ startDateTime: -1 }),
    Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 }),
    CandidatePrivacySettings.findOne({ candidateId: req.user.candidateId }),
  ]);

  res.json({
    exportedAt: new Date(),
    candidate,
    resumes,
    applications,
    assessmentHistory: attempts,
    interviews,
    notifications,
    privacy,
  });
});

export const deactivateCandidateAccount = asyncHandler(async (req, res) => {
  const user = await getCurrentUserWithPassword(req);
  const passwordMatches = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid password");
  }

  user.accountStatus = "deactivated";
  user.deactivatedAt = new Date();
  await user.save();

  await Candidate.findByIdAndUpdate(req.user.candidateId, {
    discoverable: false,
  });
  await CandidatePrivacySettings.findOneAndUpdate(
    { candidateId: req.user.candidateId },
    {
      profileVisibility: "Private",
      resumeVisibility: "Private",
    },
    { upsert: true, new: true },
  );
  await revokeAllUserSessions(user._id);

  res.json({
    message: "Your account has been deactivated.",
    logoutRequired: true,
  });
});

export const deleteCandidateAccount = asyncHandler(async (req, res) => {
  const user = await getCurrentUserWithPassword(req);
  const passwordMatches = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid password");
  }
  if (req.body.confirmationText !== "DELETE") {
    throw new ApiError(400, "Confirmation text must be DELETE");
  }

  const deletionStamp = Date.now();
  user.accountStatus = "deleted";
  user.deletedAt = new Date();
  user.email = `deleted-${deletionStamp}-${user._id}@example.invalid`;
  user.name = "Deleted Candidate";
  await user.save();

  await Candidate.findByIdAndUpdate(req.user.candidateId, {
    name: "Deleted Candidate",
    email: user.email,
    phone: "",
    summary: "",
    careerObjective: "",
    socialLinks: {
      linkedin: "",
      github: "",
      portfolio: "",
      website: "",
      other: [],
    },
    resumeUrl: "",
    discoverable: false,
  });

  await Resume.updateMany(
    { candidateId: req.user.candidateId },
    {
      isDefault: false,
      visibility: {
        useForApplications: false,
        visibleAfterApplication: false,
        discoverableByVerifiedRecruiters: false,
        keepPrivate: true,
      },
    },
  );

  await CandidatePrivacySettings.findOneAndUpdate(
    { candidateId: req.user.candidateId },
    {
      profileVisibility: "Private",
      resumeVisibility: "Private",
      skillPassportVisibility: "Candidate only",
    },
    { upsert: true },
  );

  await revokeAllUserSessions(user._id);

  res.json({
    message: "Your account deletion request has been processed.",
    logoutRequired: true,
  });
});

export const getCandidateSecuritySessions = asyncHandler(async (req, res) => {
  const sessions = await getActiveUserSessions(req.user.userId);
  res.json({
    items: sessions.map((session) => ({
      _id: session._id,
      sessionId: session.sessionId,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      approximateLocation: session.approximateLocation,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      isCurrent: session.sessionId === req.user.sessionId,
    })),
  });
});

export const deleteCandidateSecuritySession = asyncHandler(async (req, res) => {
  const session = await revokeUserSession(req.params.sessionId, req.user.userId);
  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  res.json({
    message: "Session revoked successfully.",
    logoutRequired: req.params.sessionId === req.user.sessionId,
  });
});

export const deleteOtherCandidateSecuritySessions = asyncHandler(async (req, res) => {
  const count = await revokeAllOtherUserSessions(req.user.userId, req.user.sessionId);
  res.json({
    message: "Other sessions revoked successfully.",
    revokedSessions: count,
  });
});
