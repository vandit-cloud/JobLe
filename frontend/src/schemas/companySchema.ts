import { z } from "zod";

export const companyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: z.string().url("Enter a valid website").or(z.literal("")),
  industry: z.string().min(1, "Industry is required"),
  companySize: z.string().min(1, "Company size is required"),
  foundedYear: z.coerce.number().max(new Date().getFullYear(), "Founded year cannot be in the future"),
  email: z.string().email("Enter a valid company email").or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  headquarters: z.string().min(1, "Headquarters is required"),
  officeLocations: z.array(z.string()).default([]),
  description: z.string().min(100, "Description must be at least 100 characters"),
  mission: z.string().min(1, "Mission is required"),
  culture: z.string().min(1, "Culture is required"),
  benefits: z.array(z.string()).default([]),
  socialLinks: z.object({
    linkedin: z.string().url("Enter a valid LinkedIn URL").or(z.literal("")),
    other: z.array(z.string().url("Enter valid URLs")).default([]),
  }),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

