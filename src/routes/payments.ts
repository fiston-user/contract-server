import express from "express";
import {
  createCheckoutSession,
  getMembershipStatus,
} from "../controllers/paymentController";
import { isAuthenticated } from "../middleware/auth";

const router = express.Router();

router.post("/create-checkout-session", isAuthenticated, createCheckoutSession);
router.get("/membership-status", isAuthenticated, getMembershipStatus);

export default router;
