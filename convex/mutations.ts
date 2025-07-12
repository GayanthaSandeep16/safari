import { v } from "convex/values";
import { MutationCtx, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { nanoid } from "nanoid";
import { api } from "./_generated/api";

/**
 * Creates a new safari.
 * @param ctx - The Convex mutation context.
 * @param args - Contains date, title, description, maxCapacity, basePrice, userId, status, isShared.
 * @returns A promise resolving to the ID of the created safari.
 */
export const createSafari = mutation({
  args: {
    date: v.string(),
    title: v.string(),
    description: v.string(),
    maxCapacity: v.number(),
    basePrice: v.number(),
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled")),
    isShared: v.boolean(),
  },
  handler: async (ctx: MutationCtx, args) => {
    // Validate user exists
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const safariId = await ctx.db.insert("safaris", {
      date: args.date,
      title: args.title,
      description: args.description,
      maxCapacity: args.maxCapacity,
      basePrice: args.basePrice,
      userId: args.userId,
      status: args.status,
      imageUrl: undefined,
      isShared: args.isShared,
    });
    return safariId;
  },
});

/**
 * Creates a new booking for a safari.
 * @param ctx - The Convex mutation context.
 * @param args - Contains safariId, userId, bookingType, status, createdAt.
 * @returns A promise resolving to the ID of the created booking.
 */
export const createBooking = mutation({
  args: {
    safariId: v.id("safaris"),
    userId: v.id("users"),
    bookingType: v.union(v.literal("individual"), v.literal("group")),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("cancelled")),
    createdAt: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    // Validate safari exists
    const safari = await ctx.db.get(args.safariId);
    if (!safari) throw new Error("Safari not found");

    // Validate user exists
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const bookingId = await ctx.db.insert("bookings", {
      safariId: args.safariId,
      userId: args.userId,
      bookingType: args.bookingType,
      status: args.status,
      paymentId: undefined,
      createdAt: args.createdAt,
    });
    return bookingId;
  },
});

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

export const createPayment = mutation({
  args: {
    userId: v.id('users'),
    amount: v.number(),
    currency: v.string(),
    method: v.string(),
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed'), v.literal('refunded')),
    transactionId: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('payments', args);
  },
});

export const updatePayment = mutation({
  args: {
    transactionId: v.string(),
    status: v.union(v.literal("completed"), v.literal("pending"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_transactionId", (q) => q.eq("transactionId", args.transactionId))
      .first();

    if (!payment) {
      console.error(`Payment with transactionId ${args.transactionId} not found.`);
      return null;
    }

    await ctx.db.patch(payment._id, { status: args.status });
    return payment._id;
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

/**
 * Updates a group with non-user members and creates passenger entries.
 * This mutation is intended to be called from the client after initial group creation.
 * @param ctx - The Convex mutation context.
 * @param args - Contains groupId, bookingId, leadUserId, leadPhone, members, and maxCapacity.
 */
export const updateGroupWithMembersAndPassengers = mutation({
  args: {
    groupId: v.id("groups"),
    bookingId: v.id("bookings"),
    leadUserId: v.id("users"),
    leadPhone: v.string(),
    members: v.array(v.object({
      name: v.string(),
      country: v.string(),
      age: v.number(),
      gender: v.union(v.literal('male'), v.literal('female')),
      phone: v.string(),
    })),
    maxCapacity: v.number(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    const currentSize = args.members.length + 1; // Lead + additional members

    // Update group with non-user members and current size
    const nonUserMembers = args.members.map(m => ({
      name: m.name,
      age: m.age,
    }));
    await ctx.db.patch(args.groupId, {
      nonUserMembers,
      currentSize,
      status: currentSize === args.maxCapacity ? 'full' : 'open',
    });

    // Create Passenger for the lead user
    await ctx.db.insert('passengers', {
      bookingId: args.bookingId,
      groupId: args.groupId,
      userId: args.leadUserId,
      name: 'Lead User', // You might want to fetch the actual name from the user table
      age: 0, // Placeholder, update if user profile has age
      phone: args.leadPhone,
      isUser: true,
    });

    // Create Passengers for non-user members
    for (const member of args.members) {
      await ctx.db.insert('passengers', {
        bookingId: args.bookingId,
        groupId: args.groupId,
        userId: undefined, // Non-user members don't have a userId
        name: member.name,
        age: member.age,
        phone: member.phone,
        isUser: false,
      });
    }
  },
});