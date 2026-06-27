import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { Interview } from "../models/Interview.js";
import { Job } from "../models/Job.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const recruiterId = new mongoose.Types.ObjectId(req.user.recruiterId);

  const [jobSummary, applicationSummary, interviews, jobsByMonth, statusBreakdown] = await Promise.all([
    Job.aggregate([
      { $match: { recruiterId, deletedAt: null } },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          activeJobs: {
            $sum: {
              $cond: [{ $eq: ["$status", "Published"] }, 1, 0],
            },
          },
          draftJobs: {
            $sum: {
              $cond: [{ $eq: ["$status", "Draft"] }, 1, 0],
            },
          },
          closedJobs: {
            $sum: {
              $cond: [{ $eq: ["$status", "Closed"] }, 1, 0],
            },
          },
        },
      },
    ]),
    Application.aggregate([
      { $match: { recruiterId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    Interview.aggregate([
      { $match: { recruiterId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    Application.aggregate([
      { $match: { recruiterId } },
      {
        $group: {
          _id: { $month: "$appliedAt" },
          applicants: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
    ]),
    Job.aggregate([
      { $match: { recruiterId, deletedAt: null } },
      {
        $group: {
          _id: "$status",
          value: { $sum: 1 },
        },
      },
    ]),
  ]);

  res.json({
    jobs: jobSummary[0] || {
      totalJobs: 0,
      activeJobs: 0,
      draftJobs: 0,
      closedJobs: 0,
    },
    applicationSummary,
    interviews,
    jobsByMonth,
    statusBreakdown,
  });
});

