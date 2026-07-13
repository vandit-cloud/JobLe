import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Candidate } from "../models/Candidate.js";
import { Company } from "../models/Company.js";
import { Recruiter } from "../models/Recruiter.js";
import { User } from "../models/User.js";
import { createUserSession } from "../services/sessionService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function signToken(user, sessionId) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, sid: sessionId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

async function ensureEmailAvailable(email) {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }
}

function buildAuthPayload({ user, sessionId, recruiter = null, candidate = null }) {
  return {
    token: signToken(user, sessionId),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      recruiterId: recruiter?._id || null,
      companyId: recruiter?.companyId?._id || recruiter?.companyId || null,
      candidateId: candidate?._id || null,
    },
  };
}

export const registerRecruiter = asyncHandler(async (req, res) => {
  const { name, email, password, phone, position, companyName, companyIndustry, companyWebsite } = req.body;
  await ensureEmailAvailable(email);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "recruiter",
  });

  const recruiter = await Recruiter.create({
    userId: user._id,
    name,
    email: email.toLowerCase(),
    phone: phone || "",
    position: position || "",
    billingRole: "owner",
  });

  const company = await Company.create({
    recruiterId: recruiter._id,
    name: companyName,
    industry: companyIndustry,
    website: companyWebsite || "",
    email: email.toLowerCase(),
  });

  recruiter.companyId = company._id;
  await recruiter.save();

  const populatedRecruiter = await Recruiter.findById(recruiter._id).populate("companyId");
  const session = await createUserSession({ req, user });

  res.status(201).json(buildAuthPayload({ user, sessionId: session.sessionId, recruiter: populatedRecruiter }));
});

export const registerCandidate = asyncHandler(async (req, res) => {
  const { name, email, password, phone, professionalTitle, location } = req.body;
  await ensureEmailAvailable(email);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "candidate",
  });

  const candidate = await Candidate.create({
    userId: user._id,
    name,
    email: email.toLowerCase(),
    phone: phone || "",
    professionalTitle: professionalTitle || "",
    location: location || "",
    resumeUrl: "",
    skills: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    languages: [],
  });

  const session = await createUserSession({ req, user });

  res.status(201).json(buildAuthPayload({ user, sessionId: session.sessionId, candidate }));
});

export const loginRecruiter = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || user.role !== "recruiter") {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (user.accountStatus !== "active") {
    throw new ApiError(403, "This account is not active");
  }

  const recruiter = await Recruiter.findOne({ userId: user._id }).populate("companyId");
  const session = await createUserSession({ req, user });

  res.json(buildAuthPayload({ user, sessionId: session.sessionId, recruiter }));
});

export const loginCandidate = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || user.role !== "candidate") {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (user.accountStatus !== "active") {
    throw new ApiError(403, "This account is not active");
  }

  const candidate = await Candidate.findOne({ userId: user._id });
  const session = await createUserSession({ req, user });

  res.json(buildAuthPayload({ user, sessionId: session.sessionId, candidate }));
});

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || user.role !== "admin") {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (user.accountStatus !== "active") {
    throw new ApiError(403, "This account is not active");
  }

  const session = await createUserSession({ req, user });
  res.json(buildAuthPayload({ user, sessionId: session.sessionId }));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const recruiter = req.user.role === "recruiter" ? await Recruiter.findById(req.user.recruiterId) : null;
  const candidate = req.user.role === "candidate" ? await Candidate.findById(req.user.candidateId) : null;

  res.json({
    user: {
      id: req.user.userId,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      recruiterId: req.user.recruiterId,
      candidateId: req.user.candidateId,
      companyId: recruiter?.companyId || null,
      billingRole: recruiter?.billingRole || null,
      sessionId: req.user.sessionId || null,
      candidateProfile: candidate
        ? {
            professionalTitle: candidate.professionalTitle,
            location: candidate.location,
          }
        : null,
    },
  });
});
