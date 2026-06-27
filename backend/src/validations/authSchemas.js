import { z } from "zod";

export const recruiterLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const candidateLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const recruiterRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  position: z.string().optional(),
  companyName: z.string().min(2),
  companyIndustry: z.string().min(2),
  companyWebsite: z.string().url().optional().or(z.literal("")),
});

export const candidateRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  professionalTitle: z.string().optional(),
  location: z.string().optional(),
});
