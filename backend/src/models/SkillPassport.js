import mongoose from "mongoose";

const confirmedSkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "General", trim: true },
    level: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"], default: "Intermediate" },
  },
  { _id: false },
);

const passportQuestionSchema = new mongoose.Schema(
  {
    questionId: String,
    sectionTitle: String,
    skill: String,
    questionText: String,
    options: {
      type: [{ id: String, text: String }],
      default: [],
    },
    correctOptionIds: {
      type: [String],
      default: [],
    },
    marks: {
      type: Number,
      default: 1,
    },
  },
  { _id: false },
);

const skillPassportSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      unique: true,
      index: true,
    },
    confirmedSkills: {
      type: [confirmedSkillSchema],
      default: [],
    },
    testPlan: {
      testType: { type: String, default: "Standard Skill Test" },
      durationMinutes: { type: Number, default: 75 },
      sections: {
        type: [
          {
            title: String,
            skill: String,
            questionType: String,
            questionCount: Number,
            durationMinutes: Number,
          },
        ],
        default: [],
      },
      generatedAt: Date,
    },
    currentTest: {
      status: {
        type: String,
        enum: ["Not Started", "In Progress", "Submitted"],
        default: "Not Started",
      },
      testType: { type: String, default: "Standard Skill Test" },
      startedAt: Date,
      submittedAt: Date,
      questions: {
        type: [passportQuestionSchema],
        default: [],
      },
    },
    result: {
      overallScore: { type: Number, default: 0 },
      level: { type: String, default: "" },
      skillScores: {
        type: [{ skill: String, score: Number }],
        default: [],
      },
      verifiedSkills: {
        type: [String],
        default: [],
      },
      needsImprovement: {
        type: [String],
        default: [],
      },
      badges: {
        type: [{ title: String, skill: String, score: Number, level: String }],
        default: [],
      },
      publicVisible: {
        type: Boolean,
        default: true,
      },
      lastAssessedAt: Date,
    },
    recruiterActions: {
      type: [
        {
          recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "Recruiter" },
          companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
          jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
          actionType: String,
          message: String,
          status: { type: String, default: "Sent" },
          createdAt: { type: Date, default: Date.now },
          respondedAt: Date,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const SkillPassport = mongoose.model("SkillPassport", skillPassportSchema);
