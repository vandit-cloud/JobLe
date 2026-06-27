import { z } from "zod";
import { INTERVIEW_STATUSES, INTERVIEW_TYPES, RECOMMENDATION_OPTIONS } from "../constants/enums.js";

export const interviewSchema = z.object({
  applicationId: z.string().min(1),
  jobId: z.string().min(1),
  candidateId: z.string().min(1),
  title: z.string().min(1),
  startDateTime: z.string().refine((value) => new Date(value).getTime() > Date.now(), "Cannot schedule in the past"),
  duration: z.number().min(15),
  timezone: z.string().min(1),
  interviewType: z.enum(INTERVIEW_TYPES),
  interviewerName: z.string().min(1),
  interviewerEmail: z.string().email(),
  meetingLink: z.string().url().optional().or(z.literal("")),
  location: z.string().optional(),
  notes: z.string().optional(),
  sendNotification: z.boolean().optional(),
});

export const interviewUpdateSchema = interviewSchema.partial().extend({
  status: z.enum(INTERVIEW_STATUSES).optional(),
});

export const cancelInterviewSchema = z.object({
  reason: z.string().min(1),
});

export const interviewFeedbackSchema = z.object({
  technicalSkillsScore: z.number().min(1).max(10),
  communicationScore: z.number().min(1).max(10),
  problemSolvingScore: z.number().min(1).max(10),
  relevantExperienceScore: z.number().min(1).max(10),
  strengths: z.string().min(1),
  concerns: z.string().min(1),
  internalNotes: z.string().optional(),
  recommendation: z.enum(RECOMMENDATION_OPTIONS),
});

export const interviewQuestionSchema = z.object({
  applicationId: z.string().min(1),
  jobTitle: z.string().min(1),
  candidateName: z.string().min(1),
  count: z.number().min(1).max(10),
  category: z.string().min(1),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
});

