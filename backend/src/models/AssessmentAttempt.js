import mongoose from "mongoose";
import { ATTEMPT_STATUSES, INTEGRITY_STATUSES, RESUME_MATCH_STATUSES, REVIEW_STATUSES } from "../constants/enums.js";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    questionType: String,
    answerText: String,
    selectedOptionIds: {
      type: [String],
      default: [],
    },
    fileUrl: String,
    score: {
      type: Number,
      default: 0,
    },
    aiSuggestedScore: Number,
    codingSubmission: {
      programmingLanguage: String,
      code: String,
      executionResults: {
        passedTestCases: Number,
        failedTestCases: Number,
        totalTestCases: Number,
        executionTime: Number,
        memoryUsage: Number,
        compilerOutput: String,
        visibleResults: {
          type: [
            {
              input: String,
              expectedOutput: String,
              actualOutput: String,
              passed: Boolean,
            },
          ],
          default: [],
        },
      },
      submissionHistory: {
        type: [
          {
            code: String,
            language: String,
            submittedAt: Date,
            passedTestCases: Number,
            failedTestCases: Number,
          },
        ],
        default: [],
      },
      codeSimilarityWarning: {
        type: Boolean,
        default: false,
      },
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const assessmentAttemptSchema = new mongoose.Schema(
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
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
      index: true,
    },
    invitationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentInvitation",
      required: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      default: null,
    },
    candidateProfile: {
      name: String,
      email: String,
      phone: String,
      skills: {
        type: [String],
        default: [],
      },
      education: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },
      experience: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },
      projects: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },
      certifications: {
        type: [String],
        default: [],
      },
      resumeUrl: String,
    },
    resumeMatch: {
      status: {
        type: String,
        enum: RESUME_MATCH_STATUSES,
        default: "Partial Match",
      },
      score: {
        type: Number,
        default: 0,
      },
      matchedSkills: {
        type: [String],
        default: [],
      },
      missingSkills: {
        type: [String],
        default: [],
      },
      explanation: String,
      recruiterOverride: {
        type: Boolean,
        default: false,
      },
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    sectionResults: {
      type: [
        {
          sectionId: mongoose.Schema.Types.ObjectId,
          title: String,
          score: Number,
          totalMarks: Number,
        },
      ],
      default: [],
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    passingStatus: {
      type: Boolean,
      default: false,
    },
    recruiterRecommendation: String,
    completionTimeMinutes: Number,
    attemptNumber: {
      type: Number,
      default: 1,
    },
    recruiterReview: {
      status: {
        type: String,
        enum: REVIEW_STATUSES,
        default: "Awaiting Review",
      },
      note: String,
      reviewedAt: Date,
    },
    integritySummary: {
      status: {
        type: String,
        enum: INTEGRITY_STATUSES,
        default: "No Significant Flags",
      },
      totalFlags: {
        type: Number,
        default: 0,
      },
      tabSwitches: {
        type: Number,
        default: 0,
      },
      focusLosses: {
        type: Number,
        default: 0,
      },
      fullScreenExits: {
        type: Number,
        default: 0,
      },
      copyAttempts: {
        type: Number,
        default: 0,
      },
      pasteAttempts: {
        type: Number,
        default: 0,
      },
      cameraInterruptions: {
        type: Number,
        default: 0,
      },
      candidateAbsenceFlags: {
        type: Number,
        default: 0,
      },
      multiplePeopleFlags: {
        type: Number,
        default: 0,
      },
      deviceChanges: {
        type: Number,
        default: 0,
      },
      ipChanges: {
        type: Number,
        default: 0,
      },
      codeSimilarityFlags: {
        type: Number,
        default: 0,
      },
    },
    activityTimeline: {
      type: [
        {
          label: String,
          metadata: mongoose.Schema.Types.Mixed,
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ATTEMPT_STATUSES,
      default: "Pending",
    },
    startedAt: Date,
    submittedAt: Date,
  },
  {
    timestamps: true,
  },
);

export const AssessmentAttempt = mongoose.model("AssessmentAttempt", assessmentAttemptSchema);

