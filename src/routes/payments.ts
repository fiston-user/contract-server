import express from "express";
import {
  createCheckoutSession,
  getSubscriptionStatus,
  cancelSubscription,
  updatePaymentMethod,
} from "../controllers/paymentController";
import { isAuthenticated } from "../middleware/auth";

const router = express.Router();

router.post("/create-checkout-session", isAuthenticated, createCheckoutSession);
router.get("/subscription-status", isAuthenticated, getSubscriptionStatus);
router.post("/cancel-subscription", isAuthenticated, cancelSubscription);
router.post("/update-payment-method", isAuthenticated, updatePaymentMethod);

// Remove the webhook route from here, as it's now handled directly in app.ts
// router.post('/webhook', express.raw({type: 'application/json'}), handleWebhook);

export default router;
