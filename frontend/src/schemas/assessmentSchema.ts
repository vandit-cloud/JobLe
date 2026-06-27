import { z } from "zod";

export const assessmentQuestionSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.string().min(1),
  skill: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.string().min(1),
  marks: z.coerce.number().min(0),
  negativeMarks: z.coerce.number().min(0),
  expectedAnswer: z.string().optional(),
  answerExplanation: z.string().optional(),
  source: z.string().default("Manual"),
  options: z.array(z.object({ id: z.string(), text: z.string() })).default([]),
  correctOptionIds: z.array(z.string()).default([]),
  visibleTestCases: z.array(z.object({ input: z.string(), output: z.string(), explanation: z.string().optional() })).default([]),
  hiddenTestCases: z.array(z.object({ input: z.string(), output: z.string() })).default([]),
  programmingLanguage: z.string().optional(),
  problemTitle: z.string().optional(),
  problemStatement: z.string().optional(),
  allowedLanguages: z.array(z.string()).default([]),
  starterCode: z.record(z.string()).default({}),
  sampleInput: z.string().optional(),
  sampleOutput: z.string().optional(),
  inputFormat: z.string().optional(),
  outputFormat: z.string().optional(),
  constraints: z.string().optional(),
  timeLimit: z.coerce.number().optional(),
  memoryLimit: z.coerce.number().optional(),
});

export const assessmentSectionSchema = z.object({
  title: z.string().min(1, "Section title is required"),
  description: z.string().optional(),
  type: z.string().min(1),
  duration: z.coerce.number().min(1),
  numberOfQuestions: z.coerce.number().min(0),
  totalMarks: z.coerce.number().min(0),
  passingScore: z.coerce.number().min(0),
  negativeMarking: z.boolean(),
  sectionOrder: z.coerce.number().min(1),
  isMandatory: z.boolean(),
  questions: z.array(assessmentQuestionSchema).min(1, "Each section needs at least one question"),
});

export const assessmentFormSchema = z
  .object({
    title: z.string().min(1, "Assessment title is required"),
    description: z.string().optional(),
    jobId: z.string().optional().nullable(),
    category: z.string().min(1),
    experienceLevel: z.string().min(1, "Experience level is required"),
    assessmentLanguage: z.string().min(1),
    candidateInstructions: z.string().min(10, "Candidate instructions must be clear"),
    sections: z.array(assessmentSectionSchema).min(1, "At least one section is required"),
    settings: z.object({
      totalDuration: z.coerce.number().min(1),
      overallPassingPercentage: z.coerce.number().min(0).max(100),
      maximumAttempts: z.coerce.number().min(1),
      assessmentStartDate: z.string().optional(),
      assessmentEndDate: z.string().optional(),
      invitationLinkExpiry: z.string().optional(),
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
      retakeWaitingPeriod: z.coerce.number().min(0),
    }),
    resumeMatchSettings: z.object({
      requiredSkills: z.array(z.string()).default([]),
      strongMatchThreshold: z.coerce.number().min(0).max(100),
      partialMatchThreshold: z.coerce.number().min(0).max(100),
      allowRecruiterOverride: z.boolean(),
    }),
    integritySettings: z.record(z.boolean()),
    resultVisibility: z.record(z.boolean()),
  })
  .refine(
    (value) =>
      !value.settings.assessmentStartDate ||
      !value.settings.assessmentEndDate ||
      new Date(value.settings.assessmentEndDate).getTime() > new Date(value.settings.assessmentStartDate).getTime(),
    {
      path: ["settings", "assessmentEndDate"],
      message: "End date must be after start date",
    },
  );

export type AssessmentFormValues = z.infer<typeof assessmentFormSchema>;

