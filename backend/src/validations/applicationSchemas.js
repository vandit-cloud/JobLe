import { z } from "zod";
import { APPLICATION_STATUSES } from "../constants/enums.js";

export const applicationQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  jobId: z.string().optional(),
  status: z.string().optional(),
  minScore: z.coerce.number().optional(),
  skills: z.string().optional(),
  experience: z.coerce.number().optional(),
  education: z.string().optional(),
  location: z.string().optional(),
  search: z.string().optional(),
});

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  note: z.string().optional(),
});

export const removeShortlistSchema = z.object({
  nextStatus: z.enum(["Under Review", "Rejected"]),
  note: z.string().optional(),
});

export const compareCandidatesSchema = z.object({
  applicationIds: z.array(z.string()).min(2).max(4),
});

