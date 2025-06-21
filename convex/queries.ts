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
  args: { userId: v.string() }, // Accept string userId
  handler: async (ctx, args) => {
    return await ctx.db
      .query("groups")
      .filter((q) => q.eq(q.field("leadId"), args.userId))
      .collect();
  },
})
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
 * Gets active safaris, potentially linked with their associated shared groups.
 * Used for displaying joinable safaris.
 */
export const getSafarisForJoining = query({
  args: {
    status: v.string(), // e.g., 'active'
  },
  handler: async (ctx, args) => {
    const safaris = await ctx.db
      .query("safaris")
      .filter((q) => q.eq(q.field("status"), args.status))
      .collect();

    // For each safari, try to find an associated *shared and open* group
    const safarisWithGroups = await Promise.all(
      safaris.map(async (safari) => {
        const group = await ctx.db
          .query("groups")
          .filter((q) =>
            q.and(
              q.eq(q.field("safariId"), safari._id),
              q.eq(q.field("status"), "open") // Ensure it's open
            )
          )
          .first();
        return { ...safari, group }; // Attach the group data if found
      })
    );

    return safarisWithGroups;
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