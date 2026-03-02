import { action, internal, internalMutation } from "./_generated/server";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import {
  normalizeIncludeRaw,
  normalizeOwnerId,
  normalizeSessionStatus,
} from "./normalize";
import type { SessionStatus } from "./schema";

type JsonObject = Record<string, unknown>;

interface UpsertSessionArgs {
  externalId: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  lastSyncedAt: number;
  debugUrl?: string;
  sessionViewerUrl?: string;
  websocketUrl?: string;
  timeout?: number;
  duration?: number;
  creditsUsed?: number;
  eventCount?: number;
  proxyBytesUsed?: number;
  profileId?: string;
  region?: string;
  headless?: boolean;
  isSelenium?: boolean;
  userAgent?: string;
  raw?: unknown;
  ownerId: string;
}

const pickFirstString = (value: JsonObject, keys: string[]): string | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string") {
      const normalized = candidate.trim();
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }

  return undefined;
};

const pickFirstNumber = (value: JsonObject, keys: string[]): number | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return undefined;
};

const pickFirstBoolean = (value: JsonObject, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      return candidate;
    }
  }

  return undefined;
};

const normalizeCreatePayload = (
  payload: JsonObject,
  ownerId: string,
  includeRaw: boolean,
): UpsertSessionArgs => {
  const now = Date.now();
  const externalId =
    pickFirstString(payload, ["externalId", "sessionExternalId", "sessionId", "id"]) ??
    undefined;
  if (!externalId) {
    throw new Error("Create response missing externalId");
  }

  const status = normalizeSessionStatus(
    pickFirstString(payload, ["status"]) ?? "live",
  );

  return {
    externalId,
    status,
    createdAt:
      pickFirstNumber(payload, ["createdAt", "created_at"]) ??
      pickFirstNumber(payload, ["created"]) ??
      now,
    updatedAt:
      pickFirstNumber(payload, ["updatedAt", "updated_at"]) ??
      pickFirstNumber(payload, ["updated"]) ??
      now,
    lastSyncedAt: now,
    debugUrl: pickFirstString(payload, ["debugUrl", "debug_url"]),
    sessionViewerUrl: pickFirstString(payload, [
      "sessionViewerUrl",
      "session_viewer_url",
      "viewerUrl",
      "viewer_url",
    ]),
    websocketUrl: pickFirstString(payload, ["websocketUrl", "websocket_url"]),
    timeout: pickFirstNumber(payload, ["timeout"]),
    duration: pickFirstNumber(payload, ["duration"]),
    creditsUsed: pickFirstNumber(payload, ["creditsUsed", "credits_used"]),
    eventCount: pickFirstNumber(payload, ["eventCount", "event_count"]),
    proxyBytesUsed: pickFirstNumber(payload, ["proxyBytesUsed", "proxy_bytes_used"]),
    profileId: pickFirstString(payload, ["profileId", "profile_id"]),
    region: pickFirstString(payload, ["region"]),
    headless: pickFirstBoolean(payload, ["headless"]),
    isSelenium: pickFirstBoolean(payload, ["isSelenium", "is_selenium"]),
    userAgent: pickFirstString(payload, ["userAgent", "user_agent"]),
    ownerId,
    ...(includeRaw ? { raw: payload } : {}),
  };
};

const upsertSession = internalMutation({
  args: {
    externalId: v.string(),
    status: v.union(v.literal("live"), v.literal("released"), v.literal("failed")),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncedAt: v.number(),
    debugUrl: v.optional(v.string()),
    sessionViewerUrl: v.optional(v.string()),
    websocketUrl: v.optional(v.string()),
    timeout: v.optional(v.number()),
    duration: v.optional(v.number()),
    creditsUsed: v.optional(v.number()),
    eventCount: v.optional(v.number()),
    proxyBytesUsed: v.optional(v.number()),
    profileId: v.optional(v.string()),
    region: v.optional(v.string()),
    headless: v.optional(v.boolean()),
    isSelenium: v.optional(v.boolean()),
    userAgent: v.optional(v.string()),
    raw: v.optional(v.any()),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("sessions")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (current && current.ownerId && current.ownerId !== args.ownerId) {
      throw new Error("ownerId mismatch for existing local session record");
    }

    if (current !== null) {
      await ctx.db.patch(current._id, args);
      return current._id;
    }

    return ctx.db.insert("sessions", args);
  },
});

export const sessions = {
  create: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      includeRaw: v.optional(v.boolean()),
      sessionArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = normalizeOwnerId(args.ownerId);
      if (!ownerId) {
        throw new Error("Missing ownerId: ownerId is required for sessions.create");
      }

      const steel = createSteelClient({ apiKey: args.apiKey });
      const sessionInput = args.sessionArgs ?? {};

      const rawSession = await steel.sessions.create(sessionInput as Record<string, unknown>);
      if (!rawSession || typeof rawSession !== "object") {
        throw new Error("Invalid response from Steel sessions.create");
      }

      const normalizedSession = normalizeCreatePayload(
        rawSession as JsonObject,
        ownerId,
        normalizeIncludeRaw(args.includeRaw),
      );
      await ctx.runMutation(internal.sessions.upsert, normalizedSession);

      return normalizedSession;
    },
  }),
  upsert: upsertSession,
};
