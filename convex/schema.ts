// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
 users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    paymentMethods: v.optional(v.array(v.string())),
    age: v.optional(v.number()),
  }).index("by_clerk_id", ["clerkId"]),

  safaris: defineTable({
    date: v.string(), 
    title: v.string(), // this is add to meaning fill name to identify the group
    description: v.string(), // any speial note added to the safari
    maxCapacity: v.number(),  // this need to limit 7
    basePrice: v.number(),
    userId: v.id("users"), 
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    imageUrl: v.optional(v.string()),
    isShared: v.boolean(), // Whether this safari is available for group sharing
  })
    .index("by_status", ["status"]),

  bookings: defineTable({
    safariId: v.id("safaris"),
    userId: v.optional(v.id("users")), // Optional for non-user bookings
    bookingType: v.union(
      v.literal("individual"),
      v.literal("group")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled")
    ),
    paymentId: v.optional(v.id("payments")),
    createdAt: v.string(),
  }).index("by_safariId", ["safariId"])
    .index("by_userId", ["userId"]),

  groups: defineTable({
    safariId: v.id("safaris"),
    leadId: v.optional(v.id("users")), // Group creator (safari maintainer)
    memberIds: v.array(v.id("users")), // Only for user members
    nonUserMembers: v.optional(v.array(v.object({
      name: v.string(),
      age: v.number(),
    }))), // For non-user members
    hasGuide: v.boolean(),
    currentSize: v.number(),
    maxSize: v.number(), // Default 6 without guide (7 total)
    joinFee: v.number(), // $1 join fee
    status: v.union(
      v.literal("open"),
      v.literal("full"),
      v.literal("closed")
    ),
    shareToken: v.optional(v.string()), // Token for sharing
  }).index("by_safariId", ["safariId"])
    .index("by_shareToken", ["shareToken"]),

  passengers: defineTable({
    bookingId: v.id("bookings"),
    groupId: v.id("groups"),
    userId: v.optional(v.id("users")), // Null for non-user passengers
    name: v.string(),
    age: v.number(), // Required age field
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    specialRequirements: v.optional(v.string()),
    isUser: v.boolean(), // Whether this is a registered user
  }).index("by_bookingId", ["bookingId"])
    .index("by_userId", ["userId"])
    .index("by_groupId", ["groupId"]),


  payments: defineTable({
    userId: v.optional(v.id("users")), // Optional for non-user payments
    amount: v.number(),
    currency: v.string(), // e.g., "USD"
    method: v.string(), // "credit_card", "paypal", etc.
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    transactionId: v.string(),
    timestamp: v.string(),
    payerEmail: v.optional(v.string()), // For non-user payments
  }).index("by_userId", ["userId"])
    .index("by_transactionId", ["transactionId"]),

  adminLogs: defineTable({
    adminId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    timestamp: v.string(),
    details: v.optional(v.string()),
  }).index("by_adminId", ["adminId"]),

  // Google Sheets sync tracking
  sheetSyncs: defineTable({
    entityType: v.string(), // "bookings", "payments", etc.
    lastSyncTime: v.string(),
    status: v.string(),
  }).index("by_entityType", ["entityType"]),
});