import { ApiError } from "../utils/apiError.js";

const BILLING_PERMISSIONS = new Set(["owner", "billing_admin"]);

export function requireBillingAccess(req, _res, next) {
  if (req.user?.role !== "recruiter" || !BILLING_PERMISSIONS.has(req.user.billingRole || "")) {
    return next(new ApiError(403, "Billing administrator access is required"));
  }

  return next();
}

