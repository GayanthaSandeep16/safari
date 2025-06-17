import { v } from "convex/values";
import { MutationCtx, mutation } from "../_generated/server";

// Placeholder email service (e.g., SendGrid, AWS SES)
async function sendEmailService(email: string, subject: string, body: string) {
  console.log(`Sending email to ${email}: ${subject} - ${body}`);
  // Integrate with actual email service here
}

/**
 * Sends an email to a user.
 * @param ctx - The Convex mutation context.
 * @param args - Contains email, subject, and body.
 * @returns A promise that resolves when the email is sent.
 */
export const sendEmail = mutation({
  args: {
    email: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx: MutationCtx, args: { email: string; subject: string; body: string }) => {
    await sendEmailService(args.email, args.subject, args.body);
  },
});