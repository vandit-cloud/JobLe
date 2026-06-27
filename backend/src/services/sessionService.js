import crypto from "crypto";
import { CandidateSession } from "../models/CandidateSession.js";

function guessLocation(ipAddress) {
  if (!ipAddress) {
    return "Unknown";
  }

  if (ipAddress === "::1" || ipAddress === "127.0.0.1" || ipAddress.startsWith("::ffff:127.")) {
    return "Local development";
  }

  return "Approximate location unavailable";
}

export async function createUserSession({ req, user }) {
  const sessionId = crypto.randomUUID();
  const ipAddress = req.ip || req.socket?.remoteAddress || "";
  const userAgent = req.headers["user-agent"] || "";

  const session = await CandidateSession.create({
    sessionId,
    userId: user._id,
    role: user.role,
    userAgent,
    ipAddress,
    approximateLocation: guessLocation(ipAddress),
    lastActivityAt: new Date(),
  });

  return session;
}

export async function touchUserSession(sessionId) {
  if (!sessionId) {
    return null;
  }

  return CandidateSession.findOneAndUpdate(
    {
      sessionId,
      revokedAt: null,
    },
    {
      lastActivityAt: new Date(),
    },
    { new: true },
  );
}

export async function revokeUserSession(sessionId, userId) {
  return CandidateSession.findOneAndUpdate(
    {
      sessionId,
      userId,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    },
    { new: true },
  );
}

export async function revokeAllOtherUserSessions(userId, currentSessionId) {
  const result = await CandidateSession.updateMany(
    {
      userId,
      revokedAt: null,
      sessionId: { $ne: currentSessionId },
    },
    {
      revokedAt: new Date(),
    },
  );

  return result.modifiedCount || 0;
}

export async function revokeAllUserSessions(userId) {
  const result = await CandidateSession.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    },
  );

  return result.modifiedCount || 0;
}

export async function getActiveUserSessions(userId) {
  return CandidateSession.find({
    userId,
    revokedAt: null,
  }).sort({ lastActivityAt: -1 });
}
