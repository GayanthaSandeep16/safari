import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/user-webhook",
  method: "POST",
  handler: httpAction(async (ctx, res) => {
    const {data} = await res.json();

    await ctx.runMutation(api.users.upsertUser, {
      clerkId: data.id,
      email: data.email_addresses[0]?.email_address,
      name: data.first_name || data.last_name ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : data.username || data.email_addresses[0]?.email_address,
      phone: data.phone_numbers[0]?.phone_number || undefined,
      role: "user",
    });
    return new Response("OK", { status: 200 });
  }),
});

export default http;
