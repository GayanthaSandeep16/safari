import { v } from "convex/values";
import { MutationCtx, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { nanoid } from "nanoid";
import { api } from "./_generated/api";

/**
 * Creates a new group for a safari.
 * @param ctx - The Convex mutation context.
 * @param args - Contains safariId, leadId, hasGuide, maxSize, and joinFee.
 * @returns A promise resolving to the ID of the created group.
 */
export const createGroup = mutation({
  args: {
    safariId: v.id("safaris"),
    leadId: v.id("users"),
    hasGuide: v.boolean(),
    maxSize: v.number(),
    joinFee: v.number(),
  },
  handler: async (ctx: MutationCtx, args: {
    safariId: Id<"safaris">;
    leadId: Id<"users">;
    hasGuide: boolean;
    maxSize: number;
    joinFee: number;
  }) => {
    // Validate safari exists
    const safari = await ctx.db.get(args.safariId);
    if (!safari) throw new Error("Safari not found");

    // Validate user exists
    const user = await ctx.db.get(args.leadId);
    if (!user) throw new Error("User not found");

    const groupId = await ctx.db.insert("groups", {
      safariId: args.safariId,
      leadId: args.leadId,
      memberIds: [args.leadId],
      nonUserMembers: [],
      hasGuide: args.hasGuide,
      currentSize: 1,
      maxSize: args.maxSize,
      joinFee: args.joinFee,
      status: "open",
      shareToken: undefined,
    });
    return groupId;
  },
});

/**
 * Allows a user to join a group using a share token.
 * @param ctx - The Convex mutation context.
 * @param args - Contains shareToken, userId, and paymentId.
 * @returns A promise resolving to the ID of the created booking.
 */
export const joinGroup = mutation({
  args: {
    shareToken: v.string(),
    userId: v.id("users"),
    paymentId: v.id("payments"),
  },
  handler: async (ctx: MutationCtx, args: {
    shareToken: string;
    userId: Id<"users">;
    paymentId: Id<"payments">;
  }) => {
    // Fetch group by shareToken
    const group = await ctx.db
      .query("groups")
      .withIndex("by_shareToken", (q: any) => q.eq("shareToken", args.shareToken))
      .first();
    if (!group) throw new Error("Group not found");
    if (group.status !== "open") throw new Error("Group is not open");
    if (group.currentSize >= group.maxSize) throw new Error("Group is full");

    // Validate user exists
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Validate payment exists
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    // Update group
    await ctx.db.patch(group._id, {
      memberIds: [...group.memberIds, args.userId],
      currentSize: group.currentSize + 1,
      status: group.currentSize + 1 === group.maxSize ? "full" : "open",
    });

    // Create booking
    const bookingId = await ctx.db.insert("bookings", {
      safariId: group.safariId,
      userId: args.userId,
      bookingType: "group",
      status: "confirmed",
      paymentId: args.paymentId,
      createdAt: new Date().toISOString(),
    });
    // Send confirmation email if user has an email
    if (user.email) {
      await ctx.runMutation(api.functions.sendEmail.sendEmail, {
        email: user.email,
        subject: "Group Join Confirmation",
        body: `You have successfully joined a safari group for safari ID ${group.safariId}.`,
      });
    }
    return bookingId;
  },
});

/**
 * Generates a share token for a group.
 * @param ctx - The Convex mutation context.
 * @param args - Contains the groupId.
 * @returns A promise resolving to the generated share token.
 */
export const generateShareLink = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx: MutationCtx, args: { groupId: Id<"groups"> }) => {
    // Validate group exists
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    const shareToken = nanoid(10);
    await ctx.db.patch(args.groupId, { shareToken });
    return shareToken;
  },
});