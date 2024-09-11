import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set in environment variables");
}

const resend = new Resend(RESEND_API_KEY);

export const sendPremiumConfirmationEmail = async (
  userEmail: string,
  userName: string
) => {
  try {
    await resend.emails.send({
      from: "Contract Analysis <noreply@simplemetrics.app>",
      to: userEmail,
      subject: "Welcome to Premium!",
      html: `
        <h1>Welcome to Premium, ${userName}!</h1>
        <p>Thank you for upgrading to our premium service. You now have access to all our advanced features, including:</p>
        <ul>
          <li>Comprehensive contract analysis</li>
          <li>Unlimited contract uploads</li>
          <li>Priority support</li>
        </ul>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The Contract Analysis Team</p>
      `,
    });
    console.log("Premium confirmation email sent successfully");
  } catch (error) {
    console.error("Error sending premium confirmation email:", error);
  }
};

export const sendSubscriptionCancelledEmail = async (
  userEmail: string,
  userName: string
) => {
  try {
    await resend.emails.send({
      from: "Contract Analysis <noreply@simplemetrics.app>",
      to: userEmail,
      subject: "Your Premium Subscription Has Been Cancelled",
      html: `
        <h1>Subscription Cancelled</h1>
        <p>Hello ${userName},</p>
        <p>We're sorry to see you go. Your premium subscription has been cancelled and will end at the end of your current billing period.</p>
        <p>If you change your mind, you can always resubscribe to regain access to our premium features.</p>
        <p>If you have any questions or feedback, please don't hesitate to contact our support team.</p>
        <p>Thank you for being a premium member.</p>
        <p>Best regards,<br>The Contract Analysis Team</p>
      `,
    });
    console.log("Subscription cancellation email sent successfully");
  } catch (error) {
    console.error("Error sending subscription cancellation email:", error);
  }
};
