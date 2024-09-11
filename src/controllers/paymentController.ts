import { Request, Response } from "express";
import Stripe from "stripe";
import User from "../models/User";
import {
  sendPremiumConfirmationEmail,
  sendSubscriptionCancelledEmail,
} from "../utils/emailService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const createCheckoutSession = async (req: Request, res: Response) => {
  const user = req.user as any;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // Set this in your .env file
          quantity: 1,
        },
      ],
      customer_email: user.email,
      mode: "subscription",
      success_url: `${process.env.CLIENT_URL}/payment-success`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      client_reference_id: user._id.toString(),
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const customerId = session.customer as string;

    if (userId && customerId) {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isPremium: true,
          stripeCustomerId: customerId,
        },
        { new: true }
      );
      console.log(`User ${userId} upgraded to premium`);

      if (user && user.email) {
        await sendPremiumConfirmationEmail(user.email, user.displayName);
      }
    }
  }

  res.json({ received: true });
};

export const getSubscriptionStatus = async (req: Request, res: Response) => {
  const user = req.user as any;

  // Check if the user has a stripeCustomerId
  if (!user.stripeCustomerId) {
    return res.json({ status: "no active subscription" });
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      res.json({
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      });
    } else {
      res.json({ status: "no active subscription" });
    }
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ error: "Failed to fetch subscription status" });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  const user = req.user as any;

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });

      await User.findByIdAndUpdate(user._id, { isPremium: false });

      await sendSubscriptionCancelledEmail(user.email, user.displayName);

      res.json({ message: "Subscription cancelled successfully" });
    } else {
      res.status(404).json({ error: "No active subscription found" });
    }
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
};

export const updatePaymentMethod = async (req: Request, res: Response) => {
  const user = req.user as any;
  const { paymentMethodId } = req.body;

  try {
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    res.json({ message: "Payment method updated successfully" });
  } catch (error) {
    console.error("Error updating payment method:", error);
    res.status(500).json({ error: "Failed to update payment method" });
  }
};
