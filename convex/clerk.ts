import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { WebhookEvent } from "./types";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx: any, request: Request): Promise<Response> => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error("CLERK_WEBHOOK_SECRET is not set in environment variables.");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const payload = await request.text();
    // Convert Headers to a plain object for Svix
    const headers: Record<string, string> = {};
    request.headers.forEach((value: string, key: string) => {
      headers[key] = value;
    });

    const wh = new Webhook(WEBHOOK_SECRET);
    let msg: WebhookEvent;
    try {
      msg = wh.verify(payload, headers) as WebhookEvent;
    } catch (err: any) {
      console.error("Error verifying webhook:", err.message);
      return new Response("Error verifying webhook", { status: 400 });
    }

    // Process the webhook event
    switch (msg.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(api.users.upsertUser, {
          clerkId: msg.data.id,
          email: msg.data.email_addresses[0]?.email_address,
          name: msg.data.first_name || msg.data.last_name ? `${msg.data.first_name || ''} ${msg.data.last_name || ''}`.trim() : msg.data.username || msg.data.email_addresses[0]?.email_address,
          phone: msg.data.phone_numbers[0]?.phone_number || undefined,
          role: "user",
        });
        break;
      case "user.deleted":
        await ctx.runMutation(api.users.deleteUser, {
          clerkId: msg.data.id,
        });
        break;
      default:
        console.warn(`Unhandled webhook event type: ${msg.type}`);
        break;
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;