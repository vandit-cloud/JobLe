import mongoose from "mongoose";
import {
  ASSESSMENT_CATEGORIES,
  ASSESSMENT_EXPERIENCE_LEVELS,
  ASSESSMENT_STATUSES,
  QUESTION_DIFFICULTIES,
  QUESTION_SOURCES,
  QUESTION_TYPES,
  RESUME_MATCH_STATUSES,
  SECTION_TYPES,
} from "../constants/enums.js";

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    questionType: {
      type: String,
      enum: QUESTION_TYPES,
      required: true,
    },
    skill: String,
    topic: String,
    difficulty: {
      type: String,
      enum: QUESTION_DIFFICULTIES,
      default: "Medium",
    },
    marks: {
      type: Number,
      default: 1,
    },
    negativeMarks: {
      type: Number,
      default: 0,
    },
    expectedAnswer: String,
    answerExplanation: String,
    recommendedTime: Number,
    source: {
      type: String,
      enum: QUESTION_SOURCES,
      default: "Manual",
    },
    options: {
      type: [
        {
          id: String,
          text: String,
        },
      ],
      default: [],
    },
    correctOptionIds: {
      type: [String],
      default: [],
    },
    multipleCorrect: {
      type: Boolean,
      default: false,
    },
    randomizeQuestionOrder: {
      type: Boolean,
      default: false,
    },
    randomizeAnswerOptionOrder: {
      type: Boolean,
      default: false,
    },
    programmingLanguage: String,
    codeSnippet: String,
    alternativeAcceptedAnswers: {
      type: [String],
      default: [],
    },
    problemTitle: String,
    problemStatement: String,
    inputFormat: String,
    outputFormat: String,
    constraints: String,
    sampleInput: String,
    sampleOutput: String,
    allowedLanguages: {
      type: [String],
      default: [],
    },
    starterCode: {
      type: Map,
      of: String,
      default: {},
    },
    visibleTestCases: {
      type: [
        {
          input: String,
          output: String,
          explanation: String,
        },
      ],
      default: [],
    },
    hiddenTestCases: {
      type: [
        {
          input: String,
          output: String,
        },
      ],
      default: [],
    },
    timeLimit: Number,
    memoryLimit: Number,
    fileSubmissionPrompt: String,
  },
  { _id: true },
);

const sectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: SECTION_TYPES,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    numberOfQuestions: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    passingScore: {
      type: Number,
      default: 0,
    },
    negativeMarking: {
      type: Boolean,
      default: false,
    },
    sectionOrder: {
      type: Number,
      required: true,
    },
    isMandatory: {
      type: Boolean,
      default: true,
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
  },
  { _id: true },
);

const assessmentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    category: {
      type: String,
      enum: ASSESSMENT_CATEGORIES,
      required: true,
    },
    experienceLevel: {
      type: String,
      enum: ASSESSMENT_EXPERIENCE_LEVELS,
      required: true,
    },
    assessmentLanguage: {
      type: String,
      default: "English",
    },
    candidateInstructions: {
      type: String,
      required: true,
    },
    sections: {
      type: [sectionSchema],
      default: [],
    },
    settings: {
      totalDuration: Number,
      overallPassingPercentage: Number,
      maximumAttempts: {
        type: Number,
        default: 1,
      },
      assessmentStartDate: Date,
      assessmentEndDate: Date,
      invitationLinkExpiry: Date,
      autoSubmitWhenTimeEnds: {
        type: Boolean,
        default: true,
      },
      allowCandidateReviewPreviousAnswers: {
        type: Boolean,
        default: true,
      },
      allowCandidateChangeAnswersBeforeSubmission: {
        type: Boolean,
        default: true,
      },
      allowCalculator: {
        type: Boolean,
        default: false,
      },
      allowCodeExecution: {
        type: Boolean,
        default: true,
      },
      requireResume: {
        type: Boolean,
        default: false,
      },
      requireCandidateEmailVerification: {
        type: Boolean,
        default: true,
      },
      requireCandidateConsent: {
        type: Boolean,
        default: true,
      },
      showResultImmediately: {
        type: Boolean,
        default: false,
      },
      allowRetake: {
        type: Boolean,
        default: false,
      },
      retakeWaitingPeriod: {
        type: Number,
        default: 0,
      },
    },
    resumeMatchSettings: {
      requiredSkills: {
        type: [String],
        default: [],
      },
      strongMatchThreshold: {
        type: Number,
        default: 75,
      },
      partialMatchThreshold: {
        type: Number,
        default: 45,
      },
      allowRecruiterOverride: {
        type: Boolean,
        default: true,
      },
      lastOutcomeLabel: {
        type: String,
        enum: RESUME_MATCH_STATUSES,
        default: "Partial Match",
      },
    },
    integritySettings: {
      fullScreenMode: Boolean,
      tabSwitchMonitoring: Boolean,
      browserFocusMonitoring: Boolean,
      copyDetection: Boolean,
      pasteDetection: Boolean,
      rightClickMonitoring: Boolean,
      multipleSessionDetection: Boolean,
      multipleDeviceDetection: Boolean,
      ipChangeDetection: Boolean,
      questionRandomization: Boolean,
      answerOptionRandomization: Boolean,
      oneTimeInvitationTokens: Boolean,
      codeSimilarityDetection: Boolean,
      cameraMonitoring: Boolean,
    },
    resultVisibility: {
      showCompleteResult: Boolean,
      showOverallScoreOnly: Boolean,
      showSectionScores: Boolean,
      showPassFailOnly: Boolean,
      hideResultUntilRecruiterReview: Boolean,
      showCorrectAnswers: Boolean,
    },
    status: {
      type: String,
      enum: ASSESSMENT_STATUSES,
      default: "Draft",
    },
    totalDuration: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    passingPercentage: {
      type: Number,
      default: 0,
    },
    archivedAt: Date,
    deletedAt: Date,
    lastAutoSavedAt: Date,
  },
  {
    timestamps: true,
  },
);

assessmentSchema.index({ organizationId: 1, title: "text", category: "text" });

export const Assessment = mongoose.model("Assessment", assessmentSchema);

