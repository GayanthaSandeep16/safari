import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin")),
    country: v.optional(v.string()),
    age: v.optional(v.number()),
  },
  handler: async (ctx: any, args: any) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        phone: args.phone,
        role: args.role,
        country: args.country,
        age: args.age,
      });
      return existingUser._id;
    } else {
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        phone: args.phone,
        role: args.role,
        country: args.country,
        age: args.age,
        paymentMethods: [],
      });
    }
  },
});

export const deleteUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx: any, args: any) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.delete(existingUser._id);
    }
  },
});