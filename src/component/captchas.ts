import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelCaptchasClient = {
  sessions?: {
    captchas?: {
      status?: (sessionId: string) => Promise<unknown>;
      solve?: (sessionId: string, body?: Record<string, unknown>) => Promise<unknown>;
      solveImage?: (sessionId: string, body: Record<string, unknown>) => Promise<unknown>;
    };
  };
};

interface CaptchaStatusArgs {
  sessionExternalId: string;
  pageId: string;
  url: string;
  isSolvingCaptcha: boolean;
  lastUpdated: number;
}

const requireOwnerId = (ownerId: string | undefined, operation: string): string => {
  const normalized = normalizeOwnerId(ownerId);
  if (!normalized) {
    throw normalizeError(`Missing ownerId: ownerId is required for ${operation}`, operation);
  }

  return normalized;
};

const runWithNormalizedError = async <T>(
  operation: string,
  handler: () => Promise<T>,
): Promise<T> => {
  try {
    return await handler();
  } catch (error) {
    throw normalizeError(error, operation);
  }
};

const normalizeWithError = <T>(operation: string, handler: () => T): T => {
  try {
    return handler();
  } catch (error) {
    throw normalizeError(error, operation);
  }
};

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

const pickFirstBoolean = (value: JsonObject, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      return candidate;
    }
  }

  return undefined;
};

const toTimestamp = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return undefined;
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const pickFirstTimestamp = (value: JsonObject, keys: string[]): number | undefined => {
  for (const key of keys) {
    const candidate = toTimestamp(value[key]);
    if (candidate !== undefined) {
      return candidate;
    }
  }

  return undefined;
};

const normalizeCaptchaStatusPayload = (
  payload: JsonObject,
  sessionExternalId: string,
  syncedAt: number,
): CaptchaStatusArgs => {
  const resolvedPageId = pickFirstString(payload, ["pageId", "page_id"]);
  if (!resolvedPageId) {
    throw normalizeError("Captcha status payload missing pageId", "captchas.status");
  }

  const url = pickFirstString(payload, ["url", "captchaUrl", "pageUrl", "page_url"]) ?? "";

  return {
    sessionExternalId,
    pageId: resolvedPageId,
    url,
    isSolvingCaptcha:
      pickFirstBoolean(payload, ["isSolvingCaptcha", "is_solving_captcha", "solving", "isSolving"]) ?? false,
    lastUpdated:
      pickFirstTimestamp(payload, ["lastUpdated", "last_updated", "updatedAt", "updated_at", "created"]) ??
      syncedAt,
  };
};

const normalizeStatusResponse = (operation: string, payload: unknown): JsonObject[] => {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is JsonObject => typeof item === "object" && item !== null);
  }

  if (payload && typeof payload === "object") {
    const envelope = payload as JsonObject;
    if (Array.isArray(envelope.items)) {
      return envelope.items.filter((item): item is JsonObject => typeof item === "object" && item !== null);
    }
    if (Array.isArray(envelope.data)) {
      return envelope.data.filter((item): item is JsonObject => typeof item === "object" && item !== null);
    }
  }

  throw normalizeError("Invalid response from Steel sessions.captchas.status", operation);
};

const normalizeSolvePayload = (
  args: {
    pageId?: string;
    url?: string;
    taskId?: string;
    commandArgs?: Record<string, unknown>;
  },
): Record<string, unknown> => {
  return {
    ...(args.commandArgs ?? {}),
    ...(args.pageId ? { pageId: args.pageId } : {}),
    ...(args.url ? { url: args.url } : {}),
    ...(args.taskId ? { taskId: args.taskId } : {}),
  };
};

const upsertCaptchaState = internalMutation({
  args: {
    sessionExternalId: v.string(),
    pageId: v.string(),
    url: v.string(),
    isSolvingCaptcha: v.boolean(),
    lastUpdated: v.number(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("captchaStates")
      .withIndex("bySessionExternalIdAndPageId", (q) =>
        q.eq("sessionExternalId", args.sessionExternalId).eq("pageId", args.pageId),
      )
      .unique();

    if (current && current.ownerId && current.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing captcha state record",
        "captchas.upsert",
      );
    }

    if (current !== null) {
      await ctx.db.patch(current._id, args);
      return;
    }

    await ctx.db.insert("captchaStates", args);
  },
});

const runCaptchaStatus = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
) => {
  const client = steel as SteelCaptchasClient;
  const method = client.sessions?.captchas?.status;
  if (!method) {
    throw normalizeError("Steel sessions.captchas.status is not available", "captchas.status");
  }

  return runWithNormalizedError("captchas.status", () => method(sessionExternalId));
};

const runCaptchaSolve = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelCaptchasClient;
  const method = client.sessions?.captchas?.solve;
  if (!method) {
    throw normalizeError("Steel sessions.captchas.solve is not available", "captchas.solve");
  }

  return runWithNormalizedError("captchas.solve", () => method(sessionExternalId, payload));
};

const runCaptchaSolveImage = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelCaptchasClient;
  const method = client.sessions?.captchas?.solveImage;
  if (!method) {
    throw normalizeError("Steel sessions.captchas.solveImage is not available", "captchas.solveImage");
  }

  return runWithNormalizedError("captchas.solveImage", () => method(sessionExternalId, payload));
};

export const captchas = {
  status: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      pageId: v.optional(v.string()),
      persistSnapshot: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "captchas.status");
      const syncedAt = Date.now();
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "captchas.status" },
      );

      const payload = await runCaptchaStatus(steel, args.sessionExternalId);
      const states = normalizeWithError("captchas.status", () =>
        normalizeStatusResponse("captchas.status", payload),
      );

      if (args.persistSnapshot) {
        for (const state of states) {
          const snapshot = normalizeWithError("captchas.status", () =>
            normalizeCaptchaStatusPayload(state, args.sessionExternalId, syncedAt),
          );
          if (args.pageId && snapshot.pageId !== args.pageId) {
            continue;
          }

          await runWithNormalizedError("captchas.upsert", () =>
            ctx.runMutation(internal.captchas.upsert, {
              ...snapshot,
              ownerId,
            }),
          );
        }
      }

      if (args.pageId) {
        return states.find((state) => {
          const pageId = pickFirstString(state, ["pageId", "page_id"]);
          return pageId === args.pageId;
        }) ?? null;
      }

      return payload;
    },
  }),
  solve: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      pageId: v.optional(v.string()),
      url: v.optional(v.string()),
      taskId: v.optional(v.string()),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "captchas.solve");

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "captchas.solve" },
      );

      return runCaptchaSolve(
        steel,
        args.sessionExternalId,
        normalizeSolvePayload({
          pageId: args.pageId,
          url: args.url,
          taskId: args.taskId,
          commandArgs: args.commandArgs,
        }),
      );
    },
  }),
  solveImage: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      imageXPath: v.string(),
      inputXPath: v.string(),
      url: v.optional(v.string()),
      commandArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "captchas.solveImage");

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "captchas.solveImage" },
      );

      return runCaptchaSolveImage(steel, args.sessionExternalId, {
        ...(args.commandArgs ?? {}),
        imageXPath: args.imageXPath,
        inputXPath: args.inputXPath,
        ...(args.url ? { url: args.url } : {}),
      });
    },
  }),
  upsert: upsertCaptchaState,
};

export const status = captchas.status;
export const solve = captchas.solve;
export const solveImage = captchas.solveImage;
export const upsert = captchas.upsert;
