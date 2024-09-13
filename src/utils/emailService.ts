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
      from: "SimpleMetrics <noreply@simplemetrics.app>",
      to: userEmail,
      subject: "Welcome to Premium!",
      html: `
        <h1 style="color: #333; font-size: 24px; font-weight: bold;">Welcome to Premium, ${userName}!</h1>
        <p style="color: #333; font-size: 16px;">Thank you for upgrading to our premium service. You now have access to all our advanced features, including:</p>
        <ul style="color: #333; font-size: 16px; list-style-type: disc; padding-left: 20px;">
          <li>Comprehensive contract analysis</li>
          <li>Unlimited contract uploads</li>
          <li>Priority support</li>
        </ul>
        <p style="color: #333; font-size: 16px;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p style="color: #333; font-size: 16px;">Best regards,<br>The SimpleMetrics Team</p>
      `,
    });
    console.log("Premium confirmation email sent successfully");
  } catch (error) {
    console.error("Error sending premium confirmation email:", error);
  }
};
