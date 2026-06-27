import { z } from "zod";

const optionalUrl = z.union([z.string().url("Enter a valid URL"), z.literal("")]).optional();

export const candidateProfileSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  professionalTitle: z.string().min(1, "Professional title is required"),
  phone: z.string().optional(),
  summary: z.string().optional(),
  careerObjective: z.string().optional(),
  yearsOfExperience: z.number().min(0).optional(),
  employmentStatus: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  skills: z.array(z.string()).default([]),
  education: z
    .array(
      z.object({
        institution: z.string().optional(),
        degree: z.string().optional(),
        field: z.string().optional(),
        graduationYear: z.number().optional(),
      }),
    )
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string().optional(),
        role: z.string().optional(),
        years: z.number().optional(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        technologies: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  certifications: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  socialLinks: z
    .object({
      linkedin: optionalUrl,
      github: optionalUrl,
      portfolio: optionalUrl,
      website: optionalUrl,
      other: z.array(z.string()).default([]),
    })
    .default({ linkedin: "", github: "", portfolio: "", website: "", other: [] }),
  jobPreferences: z
    .object({
      preferredRoles: z.array(z.string()).default([]),
      preferredIndustries: z.array(z.string()).default([]),
      preferredLocations: z.array(z.string()).default([]),
      remotePreference: z.string().optional(),
      employmentTypes: z.array(z.string()).default([]),
      expectedSalary: z.number().min(0).optional(),
      currency: z.string().optional(),
      noticePeriod: z.string().optional(),
      availableJoiningDate: z.string().optional().or(z.literal("")),
      willingToRelocate: z.boolean().optional(),
      openToRecruiterDiscovery: z.boolean().optional(),
    })
    .default({
      preferredRoles: [],
      preferredIndustries: [],
      preferredLocations: [],
      remotePreference: "Open",
      employmentTypes: [],
      expectedSalary: 0,
      currency: "USD",
      noticePeriod: "",
      availableJoiningDate: "",
      willingToRelocate: false,
      openToRecruiterDiscovery: true,
    }),
});

export const candidatePrivacySchema = z.object({
  profileVisibility: z.string(),
  resumeVisibility: z.string(),
  skillPassportVisibility: z.string(),
  contactVisibility: z.object({
    email: z.boolean(),
    phone: z.boolean(),
    location: z.boolean(),
    socialLinks: z.boolean(),
  }),
  recruiterDiscovery: z.object({
    discoverableByVerifiedRecruiters: z.boolean(),
    recruitersCanSendOpportunities: z.boolean(),
    blockedOrganizations: z.array(z.string()).default([]),
    blockedRecruiters: z.array(z.string()).default([]),
  }),
  communicationPreferences: z.object({
    applicationUpdates: z.boolean(),
    assessmentReminders: z.boolean(),
    interviewReminders: z.boolean(),
    jobRecommendations: z.boolean(),
    recruiterMessages: z.boolean(),
    productAnnouncements: z.boolean(),
    marketingMessages: z.boolean(),
  }),
  aiPreferences: z.object({
    enableRecommendations: z.boolean(),
    requestManualReview: z.boolean(),
  }),
});

export const candidateJobApplicationSchema = z.object({
  coverLetter: z.string().max(4000, "Cover letter is too long").optional(),
  screeningAnswers: z
    .array(
      z.object({
        question: z.string().min(1, "Question is required"),
        answer: z.string().min(1, "Answer is required"),
      }),
    )
    .default([]),
});

export const candidateResumeConfirmSchema = z.object({
  confirmedData: z.record(z.string(), z.any()).default({}),
  applyToProfile: z.boolean().optional(),
});

export const candidateInterviewRescheduleSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  preferredDates: z.array(z.string()).default([]),
  preferredTimeRanges: z.array(z.string()).default([]),
  additionalNote: z.string().optional(),
});

export const candidateDeactivateAccountSchema = z.object({
  password: z.string().min(8, "Password is required"),
});

export const candidateDeleteAccountSchema = z.object({
  password: z.string().min(8, "Password is required"),
  confirmationText: z.literal("DELETE", {
    errorMap: () => ({ message: "Confirmation text must be DELETE" }),
  }),
});
