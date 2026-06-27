import { Router } from "express";
import { handlePaymentWebhook } from "../controllers/webhookController.js";

const router = Router();

router.post("/payment-provider", handlePaymentWebhook);

export default router;

