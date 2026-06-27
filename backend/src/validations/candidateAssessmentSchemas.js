import { z } from "zod";

export const verifyInvitationSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
});

export const candidateProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  skills: z.array(z.string()).default([]),
  education: z.array(z.any()).default([]),
  experience: z.array(z.any()).default([]),
  projects: z.array(z.any()).default([]),
  certifications: z.array(z.string()).default([]),
});

export const saveAnswerSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  sectionId: z.string().min(1),
  questionType: z.string().min(1),
  answerText: z.string().optional(),
  selectedOptionIds: z.array(z.string()).default([]),
  code: z.string().optional(),
  programmingLanguage: z.string().optional(),
});

export const runCodeSchema = z.object({
  attemptId: z.string().min(1),
  sectionId: z.string().min(1),
  questionId: z.string().min(1),
  code: z.string().min(1),
  programmingLanguage: z.string().min(1),
});

export const integrityEventSchema = z.object({
  attemptId: z.string().min(1),
  eventType: z.string().min(1),
  severity: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

