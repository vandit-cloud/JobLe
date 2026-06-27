import mongoose from "mongoose";
import { QUESTION_DIFFICULTIES, QUESTION_SOURCES, QUESTION_TYPES } from "../constants/enums.js";

const optionSchema = new mongoose.Schema(
  {
    id: String,
    text: String,
  },
  { _id: false },
);

const questionBankItemSchema = new mongoose.Schema(
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
    source: {
      type: String,
      enum: QUESTION_SOURCES,
      default: "Manual",
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
    recommendedTime: Number,
    answerExplanation: String,
    tags: {
      type: [String],
      default: [],
    },
    mcq: {
      options: {
        type: [optionSchema],
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
      randomizeOptions: {
        type: Boolean,
        default: false,
      },
    },
    technicalPrompt: {
      programmingLanguage: String,
      codeSnippet: String,
      instructions: String,
      expectedAnswer: String,
      alternativeAcceptedAnswers: {
        type: [String],
        default: [],
      },
    },
    codingPrompt: {
      problemTitle: String,
      problemStatement: String,
      inputFormat: String,
      outputFormat: String,
      constraints: String,
      sampleInput: String,
      sampleOutput: String,
      explanation: String,
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
    },
    expectedAnswer: String,
  },
  {
    timestamps: true,
  },
);

export const QuestionBankItem = mongoose.model("QuestionBankItem", questionBankItemSchema);

