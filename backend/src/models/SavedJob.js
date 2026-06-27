import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

savedJobSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

export const SavedJob = mongoose.model("SavedJob", savedJobSchema);
