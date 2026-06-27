import { z } from "zod";

export const checkoutSchema = z.object({
  planCode: z.string().min(1),
  billingCycle: z.enum(["monthly", "yearly"]),
  couponCode: z.string().optional(),
  billingProfile: z.object({
    legalName: z.string().min(1),
    billingEmail: z.string().email(),
    billingPhone: z.string().optional(),
    country: z.string().min(1),
    state: z.string().min(1),
    city: z.string().min(1),
    address: z.string().min(1),
    postalCode: z.string().min(1),
    taxNumber: z.string().optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  checkoutId: z.string().min(1),
});

export const planChangeSchema = z.object({
  planCode: z.string().min(1),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().min(3),
});

export const paymentMethodSchema = z.object({
  type: z.string().min(1),
  brand: z.string().min(1),
  lastFour: z.string().min(4).max(4),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(new Date().getFullYear()),
  isDefault: z.boolean().default(false),
});

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  status: z.string().optional(),
  plan: z.string().optional(),
});

export const creditPurchaseSchema = z.object({
  creditType: z.enum([
    "aiQuestionCredits",
    "resumeAnalysisCredits",
    "codingExecutionCredits",
    "cameraProctoringCredits",
    "candidateInvitationCredits",
  ]),
  quantity: z.number().min(1),
});

export const couponValidateSchema = z.object({
  code: z.string().min(1),
  planCode: z.string().optional(),
  amount: z.number().min(0).optional(),
});
