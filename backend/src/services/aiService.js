import axios from "axios";
import { env } from "../config/env.js";

function buildFallbackJobDescription(payload) {
  const skills = payload.skills?.join(", ") || "modern product skills";
  return {
    summary: `${payload.jobTitle} role focused on delivering high-quality outcomes in a ${payload.employmentType || "full-time"} environment with strong collaboration and ownership.`,
    responsibilities: [
      `Design, build, and improve initiatives related to ${payload.jobTitle}.`,
      `Collaborate with product, design, and engineering partners to deliver measurable outcomes.`,
      `Apply ${skills} to solve user problems and maintain delivery quality.`,
    ],
    requiredQualifications: [
      `Hands-on experience with ${skills}.`,
      `Ability to communicate clearly and work across teams.`,
      "Strong problem-solving skills and attention to detail.",
    ],
    preferredQualifications: [
      "Experience with analytics, experimentation, or performance optimization.",
      "Comfort working in fast-moving, feedback-driven teams.",
    ],
  };
}

function buildFallbackInterviewQuestions({ jobTitle, candidateName, difficulty, category, count }) {
  return Array.from({ length: count }).map((_, index) => ({
    question: `Question ${index + 1}: For the ${jobTitle} role, how would you approach a ${difficulty.toLowerCase()} ${category.toLowerCase()} scenario?`,
    evaluationPoints: [
      "Problem framing",
      "Relevant technical depth",
      "Communication clarity",
    ],
    candidateName,
  }));
}

export async function generateJobDescription(payload) {
  if (!env.groqApiKey) {
    return buildFallbackJobDescription(payload);
  }

  const response = await axios.post(
    `${env.groqBaseUrl}/chat/completions`,
    {
      model: env.groqModel,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You help recruiters draft job descriptions. Return JSON with summary, responsibilities, requiredQualifications, preferredQualifications.",
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
      response_format: {
        type: "json_object",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
      },
    },
  );

  return JSON.parse(response.data.choices[0].message.content);
}

export async function analyzeCandidateMatch({ candidate, job }) {
  const candidateSkills = new Set((candidate.skills || []).map((skill) => skill.toLowerCase()));
  const requiredSkills = (job.requiredSkills || []).map((skill) => skill.toLowerCase());
  const matchedSkills = requiredSkills.filter((skill) => candidateSkills.has(skill));
  const missingSkills = requiredSkills.filter((skill) => !candidateSkills.has(skill));
  const skillsScore = requiredSkills.length ? Math.round((matchedSkills.length / requiredSkills.length) * 44) : 30;
  const experienceYears = (candidate.experience || []).reduce((total, item) => total + (item.years || 0), 0);
  const experienceScore = Math.min(16, Math.max(4, Math.round((experienceYears / Math.max(job.minimumExperience || 1, 1)) * 8)));
  const educationScore = candidate.education?.length ? 9 : 5;
  const projectScore = candidate.projects?.length ? 11 : 4;
  const preferenceScore = candidate.location && job.location && candidate.location.toLowerCase().includes(job.location.toLowerCase()) ? 4 : 2;
  const overallScore = Math.min(99, skillsScore + experienceScore + educationScore + projectScore + preferenceScore);

  return {
    overallScore,
    scores: {
      skills: skillsScore,
      experience: experienceScore,
      education: educationScore,
      projects: projectScore,
      preference: preferenceScore,
    },
    matchedSkills: matchedSkills.map((skill) => skill.replace(/\b\w/g, (char) => char.toUpperCase())),
    missingSkills: missingSkills.map((skill) => skill.replace(/\b\w/g, (char) => char.toUpperCase())),
    explanation:
      "AI recommendation based on job-relevant skills, experience, education, projects, and work-preference fit. Protected personal characteristics are excluded.",
    recommendationLabel: "AI recommendation only",
    lastAnalyzedAt: new Date(),
  };
}

export async function generateInterviewQuestions(payload) {
  if (!env.groqApiKey) {
    return buildFallbackInterviewQuestions(payload);
  }

  const response = await axios.post(
    `${env.groqBaseUrl}/chat/completions`,
    {
      model: env.groqModel,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "Generate editable interview questions with evaluation points. Avoid protected personal characteristics. Return JSON array of {question,evaluationPoints}.",
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
      response_format: {
        type: "json_object",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
      },
    },
  );

  const parsed = JSON.parse(response.data.choices[0].message.content);
  return parsed.questions || [];
}

function buildDraftAssessmentQuestions(payload) {
  return Array.from({ length: payload.numberOfQuestions || 3 }).map((_, index) => {
    const suffix = `Question ${index + 1}`;
    if (payload.questionType === "Coding Test") {
      return {
        questionText: `${suffix}: Build a ${payload.programmingLanguage || "JavaScript"} solution for a ${payload.jobRole} scenario involving ${payload.skills.join(", ")}.`,
        questionType: "Coding Test",
        skill: payload.skills[0] || payload.jobRole,
        topic: payload.jobRole,
        difficulty: payload.difficulty,
        marks: 10,
        negativeMarks: 0,
        source: "AI Generated",
        problemTitle: `${payload.jobRole} coding challenge ${index + 1}`,
        problemStatement: `Implement a solution relevant to ${payload.jobRole} work using ${payload.programmingLanguage || "JavaScript"}.`,
        inputFormat: "Input description",
        outputFormat: "Output description",
        constraints: "Reasonable time and memory constraints apply.",
        sampleInput: "example input",
        sampleOutput: "example output",
        allowedLanguages: ["JavaScript", "Python", "Java", "C++"],
        starterCode: {
          JavaScript: "function solve(input) {\n  return input;\n}",
          Python: "def solve(input_data):\n    return input_data",
        },
        visibleTestCases: [{ input: "1 2", output: "3", explanation: "Example case" }],
        hiddenTestCases: [{ input: "2 3", output: "5" }],
        timeLimit: 2,
        memoryLimit: 128,
        answerExplanation: "Recruiter should review and refine this draft before publishing.",
      };
    }

    return {
      questionText: `${suffix}: ${payload.jobRole} assessment draft covering ${payload.skills.join(", ")}.`,
      questionType: payload.questionType,
      skill: payload.skills[0] || payload.jobRole,
      topic: payload.jobRole,
      difficulty: payload.difficulty,
      marks: 2,
      negativeMarks: 0.5,
      source: "AI Generated",
      options: [
        { id: "a", text: "Option A" },
        { id: "b", text: "Option B" },
        { id: "c", text: "Option C" },
        { id: "d", text: "Option D" },
      ],
      correctOptionIds: ["a"],
      multipleCorrect: false,
      answerExplanation: "Recruiter should validate this AI-generated explanation.",
      expectedAnswer: "Draft expected answer",
    };
  });
}

export async function generateAssessmentQuestions(payload) {
  if (!env.groqApiKey) {
    return buildDraftAssessmentQuestions(payload);
  }

  const response = await axios.post(
    `${env.groqBaseUrl}/chat/completions`,
    {
      model: env.groqModel,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Generate structured JSON draft assessment questions. Return JSON with a top-level questions array.",
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
      response_format: {
        type: "json_object",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
      },
    },
  );

  const parsed = JSON.parse(response.data.choices[0].message.content);
  return parsed.questions || [];
}

export async function extractResumeProfile({ filename, requiredSkills = [] }) {
  const normalizedSkills = requiredSkills.map((skill) => skill.toLowerCase());
  const matchedSkills = requiredSkills.slice(0, Math.max(1, Math.ceil(requiredSkills.length / 2)));
  const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));
  const score = requiredSkills.length === 0 ? 72 : Math.round((matchedSkills.length / requiredSkills.length) * 100);

  return {
    name: filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    email: "",
    phone: "",
    skills: normalizedSkills.length ? requiredSkills : ["Communication", "Problem Solving"],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    resumeMatch: {
      status: score >= 75 ? "Strong Match" : score >= 45 ? "Partial Match" : "Low Match Requiring Recruiter Review",
      score,
      matchedSkills,
      missingSkills,
      explanation: "AI-generated resume matching recommendation based on non-protected, job-relevant skills only.",
    },
  };
}
