import { Router } from "express";
import {
  cancelSubscription,
  createPaymentMethod,
  createSubscriptionCheckout,
  deletePaymentMethod,
  downloadInvoice,
  getCredits,
  getInvoices,
  getInvoiceById,
  getPaymentMethods,
  getSubscriptionOverview,
  getSubscriptionPlans,
  getSubscriptionUsage,
  pauseSubscription,
  purchaseCredits,
  reactivateSubscription,
  setDefaultPaymentMethod,
  upgradeSubscription,
  validateCoupon,
  verifySubscriptionPayment,
  downgradeSubscription,
} from "../controllers/recruiterSubscriptionController.js";
import { authenticate, requireRecruiter } from "../middleware/auth.js";
import { requireBillingAccess } from "../middleware/billing.js";
import { validate } from "../middleware/validate.js";
import {
  cancelSubscriptionSchema,
  checkoutSchema,
  couponValidateSchema,
  creditPurchaseSchema,
  invoiceQuerySchema,
  paymentMethodSchema,
  planChangeSchema,
  verifyPaymentSchema,
} from "../validations/subscriptionSchemas.js";

const router = Router();

router.use(authenticate, requireRecruiter);

router.get("/subscription", getSubscriptionOverview);
router.get("/subscription/plans", getSubscriptionPlans);
router.get("/subscription/usage", getSubscriptionUsage);
router.post("/subscription/checkout", requireBillingAccess, validate(checkoutSchema), createSubscriptionCheckout);
router.post("/subscription/verify-payment", requireBillingAccess, validate(verifyPaymentSchema), verifySubscriptionPayment);
router.post("/subscription/upgrade", requireBillingAccess, validate(planChangeSchema), upgradeSubscription);
router.post("/subscription/downgrade", requireBillingAccess, validate(planChangeSchema), downgradeSubscription);
router.post("/subscription/cancel", requireBillingAccess, validate(cancelSubscriptionSchema), cancelSubscription);
router.post("/subscription/reactivate", requireBillingAccess, reactivateSubscription);
router.post("/subscription/pause", requireBillingAccess, pauseSubscription);
router.get("/subscription/payment-methods", requireBillingAccess, getPaymentMethods);
router.post("/subscription/payment-methods", requireBillingAccess, validate(paymentMethodSchema), createPaymentMethod);
router.patch("/subscription/payment-methods/:paymentMethodId/default", requireBillingAccess, setDefaultPaymentMethod);
router.delete("/subscription/payment-methods/:paymentMethodId", requireBillingAccess, deletePaymentMethod);
router.get("/subscription/invoices", requireBillingAccess, validate(invoiceQuerySchema, "query"), getInvoices);
router.get("/subscription/invoices/:invoiceId", requireBillingAccess, getInvoiceById);
router.get("/subscription/invoices/:invoiceId/download", requireBillingAccess, downloadInvoice);
router.get("/subscription/credits", requireBillingAccess, getCredits);
router.post("/subscription/credits/purchase", requireBillingAccess, validate(creditPurchaseSchema), purchaseCredits);
router.post("/subscription/coupons/validate", requireBillingAccess, validate(couponValidateSchema), validateCoupon);

export default router;

