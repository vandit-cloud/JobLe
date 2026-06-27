import { z } from "zod";
import {
  ASSESSMENT_CATEGORIES,
  ASSESSMENT_EXPERIENCE_LEVELS,
  ASSESSMENT_STATUSES,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  SECTION_TYPES,
} from "../constants/enums.js";

const optionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
});

const questionSchema = z.object({
  _id: z.string().optional(),
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(QUESTION_TYPES),
  skill: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.enum(QUESTION_DIFFICULTIES).default("Medium"),
  marks: z.number().min(0),
  negativeMarks: z.number().min(0).default(0),
  expectedAnswer: z.string().optional(),
  answerExplanation: z.string().optional(),
  recommendedTime: z.number().optional(),
  source: z.enum(["Manual", "AI Generated", "Question Bank"]).default("Manual"),
  options: z.array(optionSchema).default([]),
  correctOptionIds: z.array(z.string()).default([]),
  multipleCorrect: z.boolean().default(false),
  randomizeQuestionOrder: z.boolean().optional(),
  randomizeAnswerOptionOrder: z.boolean().optional(),
  programmingLanguage: z.string().optional(),
  codeSnippet: z.string().optional(),
  alternativeAcceptedAnswers: z.array(z.string()).default([]),
  problemTitle: z.string().optional(),
  problemStatement: z.string().optional(),
  inputFormat: z.string().optional(),
  outputFormat: z.string().optional(),
  constraints: z.string().optional(),
  sampleInput: z.string().optional(),
  sampleOutput: z.string().optional(),
  allowedLanguages: z.array(z.string()).default([]),
  starterCode: z.record(z.string()).default({}),
  visibleTestCases: z.array(z.object({ input: z.string(), output: z.string(), explanation: z.string().optional() })).default([]),
  hiddenTestCases: z.array(z.object({ input: z.string(), output: z.string() })).default([]),
  timeLimit: z.number().optional(),
  memoryLimit: z.number().optional(),
  fileSubmissionPrompt: z.string().optional(),
});

const sectionSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(1, "Section title is required"),
  description: z.string().optional(),
  type: z.enum(SECTION_TYPES),
  duration: z.number().min(1, "Duration must be greater than zero"),
  numberOfQuestions: z.number().min(0),
  totalMarks: z.number().min(0),
  passingScore: z.number().min(0),
  negativeMarking: z.boolean().default(false),
  sectionOrder: z.number().min(1),
  isMandatory: z.boolean().default(true),
  questions: z.array(questionSchema).default([]),
});

export const assessmentSchema = z
  .object({
    title: z.string().min(1, "Assessment title is required"),
    description: z.string().optional(),
    jobId: z.string().optional().nullable(),
    category: z.enum(ASSESSMENT_CATEGORIES),
    experienceLevel: z.enum(ASSESSMENT_EXPERIENCE_LEVELS),
    assessmentLanguage: z.string().default("English"),
    candidateInstructions: z.string().min(10, "Candidate instructions must be clear"),
    sections: z.array(sectionSchema).min(1, "At least one section is required"),
    settings: z.object({
      totalDuration: z.number().min(1),
      overallPassingPercentage: z.number().min(0).max(100),
      maximumAttempts: z.number().min(1),
      assessmentStartDate: z.string().optional().or(z.literal("")),
      assessmentEndDate: z.string().optional().or(z.literal("")),
      invitationLinkExpiry: z.string().optional().or(z.literal("")),
      autoSubmitWhenTimeEnds: z.boolean(),
      allowCandidateReviewPreviousAnswers: z.boolean(),
      allowCandidateChangeAnswersBeforeSubmission: z.boolean(),
      allowCalculator: z.boolean(),
      allowCodeExecution: z.boolean(),
      requireResume: z.boolean(),
      requireCandidateEmailVerification: z.boolean(),
      requireCandidateConsent: z.boolean(),
      showResultImmediately: z.boolean(),
      allowRetake: z.boolean(),
      retakeWaitingPeriod: z.number().min(0),
    }),
    resumeMatchSettings: z
      .object({
        requiredSkills: z.array(z.string()).default([]),
        strongMatchThreshold: z.number().min(0).max(100).default(75),
        partialMatchThreshold: z.number().min(0).max(100).default(45),
        allowRecruiterOverride: z.boolean().default(true),
      })
      .default({
        requiredSkills: [],
        strongMatchThreshold: 75,
        partialMatchThreshold: 45,
        allowRecruiterOverride: true,
      }),
    integritySettings: z.object({
      fullScreenMode: z.boolean(),
      tabSwitchMonitoring: z.boolean(),
      browserFocusMonitoring: z.boolean(),
      copyDetection: z.boolean(),
      pasteDetection: z.boolean(),
      rightClickMonitoring: z.boolean(),
      multipleSessionDetection: z.boolean(),
      multipleDeviceDetection: z.boolean(),
      ipChangeDetection: z.boolean(),
      questionRandomization: z.boolean(),
      answerOptionRandomization: z.boolean(),
      oneTimeInvitationTokens: z.boolean(),
      codeSimilarityDetection: z.boolean(),
      cameraMonitoring: z.boolean(),
    }),
    resultVisibility: z.object({
      showCompleteResult: z.boolean(),
      showOverallScoreOnly: z.boolean(),
      showSectionScores: z.boolean(),
      showPassFailOnly: z.boolean(),
      hideResultUntilRecruiterReview: z.boolean(),
      showCorrectAnswers: z.boolean(),
    }),
    status: z.enum(ASSESSMENT_STATUSES).optional(),
  })
  .refine((value) => !value.settings.assessmentStartDate || !value.settings.assessmentEndDate || new Date(value.settings.assessmentEndDate) > new Date(value.settings.assessmentStartDate), {
    path: ["settings", "assessmentEndDate"],
    message: "End date must be after start date",
  });

export const assessmentQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  jobId: z.string().optional(),
  category: z.string().optional(),
  sort: z.string().optional(),
});

export const assessmentStatusSchema = z.object({
  status: z.enum(["Draft", "Published", "Paused", "Archived"]),
});

export const generateAssessmentQuestionsSchema = z.object({
  jobRole: z.string().min(1),
  skills: z.array(z.string()).min(1),
  experienceLevel: z.string().min(1),
  questionType: z.string().min(1),
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  numberOfQuestions: z.number().min(1).max(20),
  programmingLanguage: z.string().optional(),
  additionalInstructions: z.string().optional(),
});

export const questionBankSchema = questionSchema.extend({
  tags: z.array(z.string()).default([]),
});

export const invitationCreateSchema = z.object({
  assessmentId: z.string().min(1),
  jobId: z.string().optional(),
  candidateEmails: z.array(z.string().email()).default([]),
  candidates: z
    .array(
      z.object({
        candidateId: z.string().optional(),
        candidateName: z.string().optional(),
        candidateEmail: z.string().email(),
      }),
    )
    .default([]),
  expiryDate: z.string().optional(),
  maxAttempts: z.number().min(1).default(1),
});

export const invitationQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  assessmentId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

export const assessmentResultQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  assessmentId: z.string().optional(),
  jobId: z.string().optional(),
  reviewStatus: z.string().optional(),
  integrityStatus: z.string().optional(),
  passingStatus: z.string().optional(),
  sort: z.string().optional(),
});

export const resultReviewSchema = z.object({
  status: z.enum(["Awaiting Review", "Reviewed", "Shortlisted", "Rejected", "Interview Scheduled"]),
  note: z.string().optional(),
});

export const resultScoreAdjustmentSchema = z.object({
  questionId: z.string().min(1),
  newScore: z.number().min(0),
  reason: z.string().min(5),
});

