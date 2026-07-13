import crypto from "crypto";
import { Candidate } from "../models/Candidate.js";
import { QuestionBankItem } from "../models/QuestionBankItem.js";
import { Resume } from "../models/Resume.js";
import { SkillPassport } from "../models/SkillPassport.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const CATEGORY_HINTS = {
  Frontend: ["html", "css", "javascript", "typescript", "react", "next.js", "angular", "vue", "tailwind"],
  Backend: ["node", "express", "nest", "django", "flask", "spring", "api", "graphql"],
  Database: ["mongodb", "mysql", "postgres", "sql", "redis", "database"],
  Tools: ["git", "github", "docker", "kubernetes", "firebase", "figma", "linux"],
};

function normalizeSkillName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function inferSkillCategory(skill) {
  const lower = skill.toLowerCase();
  const found = Object.entries(CATEGORY_HINTS).find(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)));
  return found?.[0] || "General";
}

function scoreLevel(score) {
  if (score >= 90) return "Expert";
  if (score >= 80) return "Advanced";
  if (score >= 60) return "Intermediate";
  if (score >= 40) return "Beginner";
  return "Needs Practice";
}

function mapSafePassport(passport) {
  const object = passport.toObject();
  if (object.currentTest?.questions) {
    object.currentTest.questions = object.currentTest.questions.map(({ correctOptionIds: _correctOptionIds, ...question }) => question);
  }
  return object;
}

function buildTestPlan(confirmedSkills = []) {
  const topSkills = confirmedSkills.slice(0, 5);
  const skillSections = topSkills.map((skill, index) => ({
    title: `${skill.name} MCQ`,
    skill: skill.name,
    questionType: "MCQ",
    questionCount: index < 2 ? 5 : 4,
    durationMinutes: index < 2 ? 12 : 10,
  }));

  return {
    testType: "Standard Skill Test",
    durationMinutes: 75,
    sections: [
      ...skillSections,
      { title: "Logic and Debugging", skill: "Logic", questionType: "MCQ", questionCount: 5, durationMinutes: 12 },
      { title: "Coding Readiness", skill: "Coding", questionType: "MCQ", questionCount: 3, durationMinutes: 11 },
    ],
    generatedAt: new Date(),
  };
}

function fallbackQuestion(skill, index) {
  const id = crypto.createHash("sha1").update(`${skill}:${index}`).digest("hex").slice(0, 12);
  return {
    questionId: `fallback-${id}`,
    sectionTitle: `${skill} MCQ`,
    skill,
    questionText: `Which answer best shows practical understanding of ${skill}?`,
    options: [
      { id: "a", text: `Using ${skill} intentionally to solve a real requirement` },
      { id: "b", text: `Adding ${skill} anywhere without checking the problem` },
      { id: "c", text: "Ignoring maintainability and testing" },
      { id: "d", text: "Choosing tools only by popularity" },
    ],
    correctOptionIds: ["a"],
    marks: 1,
  };
}

function bankQuestionToPassportQuestion(item, sectionTitle) {
  return {
    questionId: item._id.toString(),
    sectionTitle,
    skill: item.skill || item.topic || "General",
    questionText: item.questionText,
    options: item.mcq?.options || [],
    correctOptionIds: item.mcq?.correctOptionIds || [],
    marks: item.marks || 1,
  };
}

async function buildQuestionsFromPlan(testPlan) {
  const questions = [];

  for (const section of testPlan.sections) {
    const bankItems = await QuestionBankItem.find({
      questionType: "MCQ",
      $or: [{ skill: new RegExp(section.skill, "i") }, { topic: new RegExp(section.skill, "i") }, { tags: new RegExp(section.skill, "i") }],
      "mcq.options.0": { $exists: true },
      "mcq.correctOptionIds.0": { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(section.questionCount);

    const mapped = bankItems.map((item) => bankQuestionToPassportQuestion(item, section.title));
    questions.push(...mapped);

    for (let index = mapped.length; index < section.questionCount; index += 1) {
      questions.push({
        ...fallbackQuestion(section.skill, index),
        sectionTitle: section.title,
      });
    }
  }

  return questions;
}

async function getSuggestedSkills(candidateId) {
  const [candidate, resume] = await Promise.all([
    Candidate.findById(candidateId),
    Resume.findOne({ candidateId, confirmationStatus: "CONFIRMED" }).sort({ updatedAt: -1 }),
  ]);

  const resumeData = Object.keys(resume?.confirmedData || {}).length ? resume.confirmedData : resume?.extractedData || {};
  const skills = [...(resumeData.skills || []), ...(candidate?.skills || [])]
    .map(normalizeSkillName)
    .filter(Boolean);

  return [...new Set(skills)].slice(0, 12).map((name) => ({
    name,
    category: inferSkillCategory(name),
    level: "Intermediate",
  }));
}

async function getOrCreatePassport(candidateId) {
  let passport = await SkillPassport.findOne({ candidateId });
  if (!passport) {
    const confirmedSkills = await getSuggestedSkills(candidateId);
    passport = await SkillPassport.create({
      candidateId,
      confirmedSkills,
      testPlan: buildTestPlan(confirmedSkills),
    });
  }
  return passport;
}

export const getCandidateSkillPassport = asyncHandler(async (req, res) => {
  const passport = await getOrCreatePassport(req.user.candidateId);
  res.json({ passport: mapSafePassport(passport) });
});

export const updateCandidatePassportSkills = asyncHandler(async (req, res) => {
  const passport = await getOrCreatePassport(req.user.candidateId);
  const confirmedSkills = (req.body.confirmedSkills || [])
    .map((skill) => ({
      name: normalizeSkillName(skill.name),
      category: normalizeSkillName(skill.category) || inferSkillCategory(skill.name),
      level: LEVELS.includes(skill.level) ? skill.level : "Intermediate",
    }))
    .filter((skill) => skill.name)
    .slice(0, 12);

  if (!confirmedSkills.length) {
    throw new ApiError(400, "Add at least one confirmed skill.");
  }

  passport.confirmedSkills = confirmedSkills;
  passport.testPlan = buildTestPlan(confirmedSkills);
  passport.currentTest = { status: "Not Started", questions: [] };
  await passport.save();

  res.json({ passport: mapSafePassport(passport) });
});

export const startCandidateStandardSkillTest = asyncHandler(async (req, res) => {
  const passport = await getOrCreatePassport(req.user.candidateId);
  if (!passport.confirmedSkills.length) {
    throw new ApiError(400, "Confirm skills before starting the standard skill test.");
  }

  passport.testPlan = buildTestPlan(passport.confirmedSkills);
  passport.currentTest = {
    status: "In Progress",
    testType: "Standard Skill Test",
    startedAt: new Date(),
    questions: await buildQuestionsFromPlan(passport.testPlan),
  };
  await passport.save();

  res.json({ passport: mapSafePassport(passport) });
});

export const submitCandidateStandardSkillTest = asyncHandler(async (req, res) => {
  const passport = await getOrCreatePassport(req.user.candidateId);
  if (passport.currentTest?.status !== "In Progress") {
    throw new ApiError(400, "No active standard skill test found.");
  }

  const answers = req.body.answers || {};
  const questionScores = passport.currentTest.questions.map((question) => {
    const selected = [...(answers[question.questionId] || [])].sort().join("|");
    const expected = [...(question.correctOptionIds || [])].sort().join("|");
    return {
      skill: question.skill,
      score: selected && selected === expected ? Number(question.marks || 1) : 0,
      total: Number(question.marks || 1),
    };
  });

  const grouped = new Map();
  for (const item of questionScores) {
    const current = grouped.get(item.skill) || { score: 0, total: 0 };
    current.score += item.score;
    current.total += item.total;
    grouped.set(item.skill, current);
  }

  const skillScores = [...grouped.entries()].map(([skill, value]) => ({
    skill,
    score: Math.round((value.score / Math.max(value.total, 1)) * 100),
  }));
  const overallScore = Math.round(skillScores.reduce((sum, item) => sum + item.score, 0) / Math.max(skillScores.length, 1));
  const badges = skillScores
    .filter((item) => item.score >= 40)
    .map((item) => ({
      title: `${item.skill} Verified`,
      skill: item.skill,
      score: item.score,
      level: scoreLevel(item.score),
    }));

  passport.result = {
    overallScore,
    level: scoreLevel(overallScore),
    skillScores,
    verifiedSkills: skillScores.filter((item) => item.score >= 60).map((item) => item.skill),
    needsImprovement: skillScores.filter((item) => item.score < 60).map((item) => item.skill),
    badges,
    publicVisible: true,
    lastAssessedAt: new Date(),
  };
  passport.currentTest.status = "Submitted";
  passport.currentTest.submittedAt = new Date();
  await passport.save();

  res.json({ passport: mapSafePassport(passport) });
});

export const getCandidateTalentInvitations = asyncHandler(async (req, res) => {
  const passport = await getOrCreatePassport(req.user.candidateId);
  const invitations = (passport.recruiterActions || [])
    .slice()
    .reverse()
    .map((action) => ({
      id: action._id?.toString(),
      actionType: action.actionType,
      message: action.message,
      status: action.status,
      jobId: action.jobId,
      createdAt: action.createdAt,
    }));

  res.json({ items: invitations });
});

export const respondToTalentInvitation = asyncHandler(async (req, res) => {
  const passport = await getOrCreatePassport(req.user.candidateId);
  const invitation = passport.recruiterActions.id(req.params.invitationId);
  if (!invitation) {
    throw new ApiError(404, "Talent invitation not found.");
  }

  const response = req.body.response;
  if (!["Accepted", "Rejected"].includes(response)) {
    throw new ApiError(400, "Invitation response must be Accepted or Rejected.");
  }

  invitation.status = response;
  invitation.respondedAt = new Date();
  await passport.save();

  res.json({ message: `Invitation ${response.toLowerCase()}.` });
});
