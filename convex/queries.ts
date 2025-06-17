import { v } from "convex/values";
import { QueryCtx, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Retrieves safaris, optionally filtered by status.
 * @param ctx - The Convex query context.
 * @param args - Optional status filter ("active", "completed", or "cancelled").
 * @returns A promise resolving to an array of safari objects.
 */
export const getSafaris = query({
  args: {
    status: v.optional(
      v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled"))
    ),
  },
  handler: async (ctx: QueryCtx, args: { status?: "active" | "completed" | "cancelled" }) => {
    if (args.status !== undefined) {
      return await ctx.db
        .query("safaris")
        .withIndex("by_status", (q) => q.eq("status", args.status as "active" | "completed" | "cancelled"))
        .collect();
    }
    return await ctx.db.query("safaris").collect();
  },
});

/**
 * Retrieves all groups where the user is either the lead or a member.
 * @param ctx - The Convex query context.
 * @param args - Contains the userId of the user.
 * @returns A promise resolving to an array of unique group objects.
 */
export const getGroupsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx: QueryCtx, args: { userId: Id<"users"> }) => {
    const [leadGroups, allGroups] = await Promise.all([
      ctx.db.query("groups").filter((q) => q.eq(q.field("leadId"), args.userId)).collect(),
      ctx.db.query("groups").collect(),
    ]);
    const memberGroups = allGroups.filter((group) => group.memberIds.includes(args.userId));
    const allGroupsCombined = [...leadGroups, ...memberGroups];
    const uniqueGroups = Array.from(new Set(allGroupsCombined.map((g) => g._id))).map((id) =>
      allGroupsCombined.find((g) => g._id === id)!
    );
    return uniqueGroups;
  },
});

/**
 * Retrieves all users.
 * @param ctx - The Convex query context.
 * @returns A promise resolving to an array of user objects.
 */
export const getUsers = query({
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query("users").collect();
  },
});

/**
 * Retrieves all bookings.
 * @param ctx - The Convex query context.
 * @returns A promise resolving to an array of booking objects.
 */
export const getBookings = query({
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query("bookings").collect();
  },
});

/**
 * Retrieves all groups.
 * @param ctx - The Convex query context.
 * @returns A promise resolving to an array of group objects.
 */
export const getGroups = query({
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query("groups").collect();
  },
});

/**
 * Retrieves all payments.
 * @param ctx - The Convex query context.
 * @returns A promise resolving to an array of payment objects.
 */
export const getPayments = query({
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query("payments").collect();
  },
});

/**
 * Retrieves a group by its share token.
 * @param ctx - The Convex query context.
 * @param args - Contains the shareToken of the group.
 * @returns A promise resolving to the group object or null if not found.
 */
export const getGroupByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx: QueryCtx, args: { shareToken: string }) => {
    return await ctx.db
      .query("groups")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .first();
  },
});