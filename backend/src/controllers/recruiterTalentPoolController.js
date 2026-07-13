import { Candidate } from "../models/Candidate.js";
import { Job } from "../models/Job.js";
import { Notification } from "../models/Notification.js";
import { SkillPassport } from "../models/SkillPassport.js";
import { canRecruiterDiscoverCandidate } from "../services/candidatePrivacyAccessService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function matchesText(value, query) {
  return String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
}

function mapTalentCandidate(passport, candidate) {
  return {
    candidateId: candidate._id,
    name: candidate.name,
    professionalTitle: candidate.professionalTitle,
    location: candidate.location || [candidate.city, candidate.state, candidate.country].filter(Boolean).join(", "),
    availability: candidate.availability,
    expectedSalary: candidate.jobPreferences?.expectedSalary || 0,
    currency: candidate.jobPreferences?.currency || "USD",
    education: candidate.education || [],
    experienceLevel: candidate.yearsOfExperience >= 5 ? "Advanced" : candidate.yearsOfExperience >= 2 ? "Intermediate" : "Beginner",
    yearsOfExperience: candidate.yearsOfExperience || 0,
    assessmentDate: passport.result?.lastAssessedAt,
    overallScore: passport.result?.overallScore || 0,
    level: passport.result?.level || "",
    skillScores: passport.result?.skillScores || [],
    badges: passport.result?.badges || [],
    verifiedSkills: passport.result?.verifiedSkills || [],
  };
}

export const getTalentPool = asyncHandler(async (req, res) => {
  const passports = await SkillPassport.find({
    "result.publicVisible": true,
    "result.overallScore": { $gt: 0 },
  })
    .populate("candidateId")
    .sort({ "result.overallScore": -1, "result.lastAssessedAt": -1 })
    .limit(200);

  const skill = String(req.query.skill || "").trim();
  const location = String(req.query.location || "").trim();
  const availability = String(req.query.availability || "").trim();
  const level = String(req.query.level || "").trim();
  const minScore = Number(req.query.minScore || 0);
  const search = String(req.query.search || "").trim();

  const visiblePassportPairs = (
    await Promise.all(
      passports
        .map((passport) => ({ passport, candidate: passport.candidateId }))
        .filter(({ candidate }) => candidate && candidate.discoverable !== false && candidate.jobPreferences?.openToRecruiterDiscovery !== false)
        .map(async ({ passport, candidate }) => ({
          passport,
          candidate,
          allowed: await canRecruiterDiscoverCandidate({
            candidateId: candidate._id,
            recruiterId: req.user.recruiterId,
            companyId: req.user.companyId,
          }),
        })),
    )
  ).filter((item) => item.allowed);

  const items = visiblePassportPairs
    .map(({ passport, candidate }) => mapTalentCandidate(passport, candidate))
    .filter((item) => !skill || item.skillScores.some((score) => matchesText(score.skill, skill)))
    .filter((item) => !location || matchesText(item.location, location))
    .filter((item) => !availability || matchesText(item.availability, availability))
    .filter((item) => !level || item.level === level || item.experienceLevel === level)
    .filter((item) => !minScore || item.overallScore >= minScore)
    .filter((item) => !search || matchesText(item.name, search) || matchesText(item.professionalTitle, search) || item.skillScores.some((score) => matchesText(score.skill, search)));

  res.json({
    items: items.slice(0, 50),
    summary: {
      total: items.length,
      advanced: items.filter((item) => ["Advanced", "Expert"].includes(item.level)).length,
      intermediate: items.filter((item) => item.level === "Intermediate").length,
      averageScore: Math.round(items.reduce((sum, item) => sum + item.overallScore, 0) / Math.max(items.length, 1)),
    },
  });
});

export const inviteTalentCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.candidateId);
  if (!candidate) {
    throw new ApiError(404, "Candidate not found");
  }

  const passport = await SkillPassport.findOne({ candidateId: candidate._id });
  if (!passport || !passport.result?.overallScore) {
    throw new ApiError(400, "Candidate does not have a verified skill passport yet.");
  }
  const privacyAllowed = await canRecruiterDiscoverCandidate({
    candidateId: candidate._id,
    recruiterId: req.user.recruiterId,
    companyId: req.user.companyId,
  });
  if (!privacyAllowed) {
    throw new ApiError(403, "Candidate privacy settings do not allow recruiter opportunities.");
  }

  const job = req.body.jobId ? await Job.findOne({ _id: req.body.jobId, recruiterId: req.user.recruiterId }) : null;
  const actionType = req.body.actionType || "Invite to Apply";
  const message =
    req.body.message ||
    `${req.user.name || "A recruiter"} invited you based on your verified skill passport${job ? ` for ${job.title}` : ""}.`;

  passport.recruiterActions.push({
    recruiterId: req.user.recruiterId,
    companyId: req.user.companyId,
    jobId: job?._id || null,
    actionType,
    message,
    status: "Sent",
    createdAt: new Date(),
  });
  await passport.save();

  if (candidate.userId) {
    await Notification.create({
      userId: candidate.userId,
      userRole: "candidate",
      category: "Talent pool invitation",
      title: actionType,
      message,
      relatedEntityType: job ? "job" : "skill-passport",
      relatedEntityId: job?._id?.toString() || passport._id.toString(),
      actionUrl: job ? `/jobs/${job._id}` : "/candidate/skill-passport",
      read: false,
    });
  }

  res.json({ message: "Candidate invitation sent." });
});
