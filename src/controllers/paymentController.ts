import { Request, Response } from "express";
import Stripe from "stripe";
import User from "../models/User";
import { sendPremiumConfirmationEmail } from "../utils/emailService";

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
          price_data: {
            currency: "usd",
            product_data: {
              name: "Lifetime Premium Access",
            },
            unit_amount: 2000, // $20.00
          },
          quantity: 1,
        },
      ],
      customer_email: user.email,
      mode: "payment",
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

    if (userId) {
      const user = await User.findByIdAndUpdate(
        userId,
        { isPremium: true },
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

export const getMembershipStatus = async (req: Request, res: Response) => {
  const user = req.user as any;

  if (user.isPremium) {
    res.json({ status: "active" });
  } else {
    res.json({ status: "inactive" });
  }
};

// Remove other unused functions
