import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const sessionStatusValues = ["live", "released", "failed"] as const;
export type SessionStatus = (typeof sessionStatusValues)[number];

export const sessionStatus = v.union(
  v.literal("live"),
  v.literal("released"),
  v.literal("failed"),
);

export const vString = v.string();
export const vOptionalString = v.optional(v.string());
export const vNumber = v.number();
export const vOptionalNumber = v.optional(v.number());
export const vBoolean = v.boolean();
export const vOptionalBoolean = v.optional(v.boolean());
export const vOptionalAny = v.optional(v.any());
export const vOwnerId = vString;
export const vIncludeRaw = vOptionalBoolean;

export const schema = defineSchema({
  sessions: defineTable({
    externalId: vString,
    status: sessionStatus,
    createdAt: vNumber,
    updatedAt: vNumber,
    lastSyncedAt: vNumber,
    debugUrl: vOptionalString,
    sessionViewerUrl: vOptionalString,
    websocketUrl: vOptionalString,
    timeout: vOptionalNumber,
    duration: vOptionalNumber,
    creditsUsed: vOptionalNumber,
    eventCount: vOptionalNumber,
    proxyBytesUsed: vOptionalNumber,
    profileId: vOptionalString,
    region: vOptionalString,
    headless: vOptionalBoolean,
    isSelenium: vOptionalBoolean,
    userAgent: vOptionalString,
    raw: v.optional(v.any()),
    ownerId: vOwnerId,
  })
    .index("byExternalId", ["externalId"])
    .index("byStatus", ["status"])
    .index("byCreatedAt", ["createdAt"])
    .index("byOwnerId", ["ownerId"]),
  sessionFileMetadata: defineTable({
    sessionExternalId: vString,
    path: vString,
    size: vNumber,
    lastModified: vNumber,
    lastSyncedAt: vNumber,
    ownerId: vOwnerId,
  })
    .index("bySessionExternalId", ["sessionExternalId"])
    .index("bySessionExternalIdAndPath", ["sessionExternalId", "path"])
    .index("byOwnerId", ["ownerId"]),
  captchaStates: defineTable({
    sessionExternalId: vString,
    pageId: vString,
    url: vString,
    isSolvingCaptcha: vBoolean,
    lastUpdated: vNumber,
    ownerId: vOwnerId,
  })
    .index("bySessionExternalId", ["sessionExternalId"])
    .index("bySessionExternalIdAndPageId", ["sessionExternalId", "pageId"])
    .index("byOwnerId", ["ownerId"]),
  profiles: defineTable({
    externalId: vString,
    name: vOptionalString,
    userDataDir: vOptionalString,
    description: vOptionalString,
    raw: vOptionalAny,
    ownerId: vOwnerId,
    lastSyncedAt: vNumber,
  })
    .index("byExternalId", ["externalId"])
    .index("byOwnerId", ["ownerId"]),
  credentials: defineTable({
    externalId: vString,
    name: vOptionalString,
    service: vOptionalString,
    type: vOptionalString,
    username: vOptionalString,
    description: vOptionalString,
    metadata: vOptionalAny,
    origin: vOptionalString,
    namespace: vOptionalString,
    createdAt: vOptionalNumber,
    updatedAt: vOptionalNumber,
    ownerId: vOwnerId,
    lastSyncedAt: vNumber,
  })
    .index("byExternalId", ["externalId"])
    .index("byOwnerId", ["ownerId"]),
  extensions: defineTable({
    externalId: vString,
    name: vOptionalString,
    version: vOptionalString,
    description: vOptionalString,
    sourceUrl: vOptionalString,
    checksum: vOptionalString,
    enabled: vOptionalBoolean,
    ownerId: vOwnerId,
    lastSyncedAt: vNumber,
  })
    .index("byExternalId", ["externalId"])
    .index("byOwnerId", ["ownerId"]),
  globalFiles: defineTable({
    externalId: vString,
    name: vOptionalString,
    path: vOptionalString,
    size: vOptionalNumber,
    lastModified: vOptionalNumber,
    sourceUrl: vOptionalString,
    mimeType: vOptionalString,
    ownerId: vOwnerId,
    lastSyncedAt: vNumber,
  })
    .index("byExternalId", ["externalId"])
    .index("byOwnerId", ["ownerId"]),
});
