import { z } from "zod";

export const jobFormSchema = z
  .object({
    title: z.string().min(1, "Job title is required"),
    department: z.string().min(1, "Department is required"),
    openings: z.coerce.number().min(1, "Number of openings must be at least 1"),
    employmentType: z.string().min(1),
    workplaceType: z.string().min(1),
    location: z.string().min(1, "Location is required"),
    summary: z.string().min(100, "Description must contain at least 100 characters"),
    responsibilities: z.array(z.string()).default([]),
    requiredQualifications: z.array(z.string()).default([]),
    preferredQualifications: z.array(z.string()).default([]),
    requiredSkills: z.array(z.string()).min(1, "At least one required skill is required"),
    preferredSkills: z.array(z.string()).default([]),
    minimumEducation: z.string().min(1, "Minimum education is required"),
    minimumExperience: z.coerce.number().min(0),
    maximumExperience: z.coerce.number().min(0),
    certifications: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    salary: z.object({
      minimum: z.coerce.number().min(0),
      maximum: z.coerce.number().min(0),
      currency: z.string().min(1),
      period: z.string().min(1),
      showPublicly: z.boolean(),
    }),
    applicationDeadline: z.string().min(1),
    screeningQuestions: z.array(z.string()).default([]),
    requireResume: z.boolean(),
    requireCoverLetter: z.boolean(),
    applicationInstructions: z.string().default(""),
  })
  .refine((values) => values.minimumExperience <= values.maximumExperience, {
    message: "Minimum experience cannot be greater than maximum experience",
    path: ["maximumExperience"],
  })
  .refine((values) => values.salary.minimum <= values.salary.maximum, {
    message: "Minimum salary cannot be greater than maximum salary",
    path: ["salary", "maximum"],
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;

