import { z } from "zod";
import { COMPANY_SIZES } from "../constants/enums.js";

const optionalUrl = z.string().url().or(z.literal("")).optional();

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: z.string().url("Website must be a valid URL").optional().or(z.literal("")),
  industry: z.string().min(1, "Industry is required"),
  companySize: z.enum(COMPANY_SIZES).optional(),
  foundedYear: z
    .number({ invalid_type_error: "Founded year is required" })
    .int()
    .max(new Date().getFullYear(), "Founded year cannot be in the future")
    .optional(),
  email: z.string().email("Company email must be valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  headquarters: z.string().optional(),
  officeLocations: z.array(z.string()).default([]),
  description: z.string().min(100, "Company description must be at least 100 characters"),
  mission: z.string().optional(),
  culture: z.string().optional(),
  benefits: z.array(z.string()).default([]),
  socialLinks: z
    .object({
      linkedin: optionalUrl,
      other: z.array(z.string().url("Social links must be valid URLs")).default([]),
    })
    .default({
      linkedin: "",
      other: [],
    }),
});

