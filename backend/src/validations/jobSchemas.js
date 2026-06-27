import { z } from "zod";
import { EMPLOYMENT_TYPES, JOB_STATUSES, SALARY_PERIODS, WORKPLACE_TYPES } from "../constants/enums.js";

const futureDateSchema = z
  .string()
  .refine((value) => new Date(value).getTime() > Date.now(), "Application deadline cannot be in the past");

export const jobSchema = z
  .object({
    title: z.string().min(1, "Job title is required"),
    department: z.string().optional(),
    openings: z.number().int().min(1, "Number of openings must be at least 1"),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    workplaceType: z.enum(WORKPLACE_TYPES),
    location: z.string().min(1, "Location is required"),
    summary: z.string().min(100, "Description must contain at least 100 characters"),
    responsibilities: z.array(z.string()).default([]),
    requiredQualifications: z.array(z.string()).default([]),
    preferredQualifications: z.array(z.string()).default([]),
    requiredSkills: z.array(z.string()).min(1, "At least one required skill is required"),
    preferredSkills: z.array(z.string()).default([]),
    minimumEducation: z.string().optional(),
    minimumExperience: z.number().min(0).default(0),
    maximumExperience: z.number().min(0).default(0),
    certifications: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    salary: z.object({
      minimum: z.number().min(0).optional(),
      maximum: z.number().min(0).optional(),
      currency: z.string().min(1),
      period: z.enum(SALARY_PERIODS),
      showPublicly: z.boolean(),
    }),
    applicationDeadline: futureDateSchema,
    screeningQuestions: z.array(z.string()).default([]),
    requireResume: z.boolean(),
    requireCoverLetter: z.boolean(),
    applicationInstructions: z.string().optional(),
    status: z.enum(JOB_STATUSES).optional(),
  })
  .refine((data) => data.minimumExperience <= data.maximumExperience, {
    path: ["maximumExperience"],
    message: "Minimum experience cannot be greater than maximum experience",
  })
  .refine(
    (data) =>
      data.salary.minimum === undefined ||
      data.salary.maximum === undefined ||
      data.salary.minimum <= data.salary.maximum,
    {
      path: ["salary", "maximum"],
      message: "Minimum salary cannot be greater than maximum salary",
    },
  );

export const generateDescriptionSchema = z.object({
  jobTitle: z.string().min(1),
  experienceLevel: z.string().min(1),
  skills: z.array(z.string()).min(1),
  employmentType: z.enum(EMPLOYMENT_TYPES),
});

export const jobQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  employmentType: z.string().optional(),
  workplaceType: z.string().optional(),
  sort: z.string().optional(),
});

export const jobStatusSchema = z.object({
  status: z.enum(["Published", "Paused", "Closed"]),
});
