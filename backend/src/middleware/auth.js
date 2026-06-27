import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Candidate } from "../models/Candidate.js";
import { Recruiter } from "../models/Recruiter.js";
import { User } from "../models/User.js";
import { touchUserSession } from "../services/sessionService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;

  if (!token) {
    throw new ApiError(401, "Authentication required");
  }

  const decoded = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(decoded.sub);

  if (!user) {
    throw new ApiError(401, "Invalid authentication token");
  }
  if (user.accountStatus !== "active") {
    throw new ApiError(403, "This account is not active");
  }

  if (decoded.sid) {
    const session = await touchUserSession(decoded.sid);
    if (!session) {
      throw new ApiError(401, "This session is no longer active");
    }
  }

  const recruiter = user.role === "recruiter" ? await Recruiter.findOne({ userId: user._id }) : null;
  const candidate = user.role === "candidate" ? await Candidate.findOne({ userId: user._id }) : null;

  req.user = {
    userId: user._id.toString(),
    role: user.role,
    recruiterId: recruiter?._id?.toString() || null,
    candidateId: candidate?._id?.toString() || null,
    companyId: recruiter?.companyId?.toString() || null,
    billingRole: recruiter?.billingRole || null,
    sessionId: decoded.sid || null,
    name: user.name,
    email: user.email,
  };

  next();
});

export function requireRecruiter(req, _res, next) {
  if (req.user?.role !== "recruiter" || !req.user?.recruiterId) {
    return next(new ApiError(403, "Recruiter access is required"));
  }

  return next();
}

export function requireCandidate(req, _res, next) {
  if (req.user?.role !== "candidate" || !req.user?.candidateId) {
    return next(new ApiError(403, "Candidate access is required"));
  }

  return next();
}
