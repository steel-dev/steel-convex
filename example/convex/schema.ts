import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const ownerStatus = v.union(
  v.literal("live"),
  v.literal("released"),
  v.literal("failed"),
);

export default defineSchema({
  sessionNotes: defineTable({
    ownerId: v.string(),
    externalId: v.string(),
    status: ownerStatus,
    lifecycleHint: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byOwner", ["ownerId"])
    .index("byOwnerAndStatus", ["ownerId", "status"]),
});