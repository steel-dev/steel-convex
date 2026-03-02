import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelProfilesClient = {
  profiles?: {
    list?: () => Promise<unknown>;
    get?: (id: string) => Promise<unknown>;
    create?: (body: Record<string, unknown>) => Promise<unknown>;
    update?: (id: string, body: Record<string, unknown>) => Promise<unknown>;
  };
};

interface ProfileMetadata {
  externalId: string;
  ownerId: string;
  lastSyncedAt: number;
  name?: string;
  userDataDir?: string;
  description?: string;
  raw?: unknown;
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

const normalizeProfileId = (payload: JsonObject): string => {
  return pickFirstString(payload, ["externalId", "profileId", "profile_id", "id", "_id"]) ?? "";
};

const normalizeUserDataDir = (payload: JsonObject): string | undefined => {
  const directValue = pickFirstString(payload, ["userDataDir", "user_data_dir", "userDataDirectory"]);
  if (directValue) {
    return directValue;
  }

  const directoryPayload = payload.userDataDir;
  if (directoryPayload && typeof directoryPayload === "object") {
    return pickFirstString(directoryPayload as JsonObject, ["url", "path", "value"]);
  }

  return pickFirstString(payload, ["userDataDirUrl", "user_data_dir_url", "storageStateUrl"]);
};

const normalizeProfileMetadata = (
  payload: JsonObject,
  ownerId: string,
  syncedAt: number,
): ProfileMetadata => {
  const externalId = normalizeProfileId(payload);
  if (!externalId) {
    throw normalizeError("Profile payload missing externalId", "profiles.normalize");
  }

  return {
    externalId,
    name: pickFirstString(payload, ["name", "profileName", "profile_name"]),
    userDataDir: normalizeUserDataDir(payload),
    description: pickFirstString(payload, ["description", "summary"]),
    raw: payload,
    ownerId,
    lastSyncedAt: syncedAt,
  };
};

const normalizeListResponse = (
  operation: string,
  response: unknown,
): { items: JsonObject[]; hasMore: boolean; continuation?: string } => {
  if (!response) {
    throw normalizeError(`Invalid response from Steel profiles.list`, operation);
  }

  if (Array.isArray(response)) {
    return {
      items: response,
      hasMore: false,
    };
  }

  const envelope = response as JsonObject;
  let items: unknown;
  if (Array.isArray(envelope.items)) {
    items = envelope.items;
  } else if (Array.isArray(envelope.profiles)) {
    items = envelope.profiles;
  } else if (Array.isArray(envelope.results)) {
    items = envelope.results;
  } else if (Array.isArray(envelope.data)) {
    items = envelope.data;
  } else {
    throw normalizeError(`Invalid response from Steel profiles.list`, operation);
  }

  const continuation = pickFirstString(envelope, [
    "continueCursor",
    "nextCursor",
    "next_cursor",
    "cursor",
    "pageCursor",
  ]);

  const hasMore = typeof envelope.hasMore === "boolean" ? envelope.hasMore : continuation !== undefined;

  return {
    items: items as JsonObject[],
    hasMore,
    continuation,
  };
};

const normalizeUrlInput = (value: unknown, operation: string): string => {
  if (typeof value !== "string") {
    throw normalizeError(`userDataDirUrl must be a URL string for ${operation}`, operation);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw normalizeError(`userDataDirUrl must be non-empty for ${operation}`, operation);
  }

  return normalized;
};

const normalizeProfileArgs = (
  args: Record<string, unknown> | undefined,
  operation: string,
): Record<string, unknown> => {
  if (!args) {
    return {};
  }

  if (typeof args !== "object" || Array.isArray(args)) {
    throw normalizeError(`Invalid profile args for ${operation}`, operation);
  }

  return { ...args };
};

const upsertProfileMetadata = internalMutation({
  args: {
    externalId: v.string(),
    name: v.optional(v.string()),
    userDataDir: v.optional(v.string()),
    description: v.optional(v.string()),
    raw: v.optional(v.any()),
    ownerId: v.string(),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("profiles")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (current && current.ownerId && current.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing local profile metadata",
        "profiles.upsert",
      );
    }

    if (current !== null) {
      await ctx.db.patch(current._id, args);
      return;
    }

    await ctx.db.insert("profiles", args);
  },
});

const runProfilesGet = async (
  steel: ReturnType<typeof createSteelClient>,
  externalId: string,
): Promise<unknown> => {
  const client = steel as SteelProfilesClient;
  const method = client.profiles?.get;
  if (!method) {
    throw normalizeError("Steel profiles.get is not available", "profiles.get");
  }

  return runWithNormalizedError("profiles.get", () => method(externalId));
};

const runProfilesList = async (
  steel: ReturnType<typeof createSteelClient>,
): Promise<unknown> => {
  const client = steel as SteelProfilesClient;
  const method = client.profiles?.list;
  if (!method) {
    throw normalizeError("Steel profiles.list is not available", "profiles.list");
  }

  return runWithNormalizedError("profiles.list", () => method());
};

const runProfilesCreate = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
): Promise<unknown> => {
  const client = steel as SteelProfilesClient;
  const method = client.profiles?.create;
  if (!method) {
    throw normalizeError("Steel profiles.create is not available", "profiles.create");
  }

  return runWithNormalizedError("profiles.create", () => method(payload));
};

const runProfilesUpdate = async (
  steel: ReturnType<typeof createSteelClient>,
  externalId: string,
  payload: Record<string, unknown>,
): Promise<unknown> => {
  const client = steel as SteelProfilesClient;
  const method = client.profiles?.update;
  if (!method) {
    throw normalizeError("Steel profiles.update is not available", "profiles.update");
  }

  return runWithNormalizedError("profiles.update", () => method(externalId, payload));
};

const createAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    profileArgs: v.optional(v.record(v.string(), v.any())),
    userDataDirUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "profiles.create");
    const steel = createSteelClient(
      { apiKey: args.apiKey },
      { operation: "profiles.create" },
    );

    const payload = normalizeProfileArgs(args.profileArgs, "profiles.create");
    if (args.userDataDirUrl !== undefined) {
      const url = normalizeUrlInput(args.userDataDirUrl, "profiles.create");
      Object.assign(payload, {
        userDataDir: url,
        userDataDirUrl: url,
      });
    }

    const raw = await runProfilesCreate(steel, payload);
    if (!raw || typeof raw !== "object") {
      throw normalizeError(
        "Invalid response from Steel profiles.create",
        "profiles.create",
      );
    }

    const metadata = normalizeProfileMetadata(raw as JsonObject, ownerId, Date.now());
    await runWithNormalizedError("profiles.upsert", () =>
      ctx.runMutation(internal.profiles.upsert, metadata),
    );

    return metadata;
  },
});

const updateAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    externalId: v.string(),
    profileArgs: v.optional(v.record(v.string(), v.any())),
    userDataDirUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "profiles.update");
    const steel = createSteelClient(
      { apiKey: args.apiKey },
      { operation: "profiles.update" },
    );

    const payload = normalizeProfileArgs(args.profileArgs, "profiles.update");
    if (args.userDataDirUrl !== undefined) {
      const url = normalizeUrlInput(args.userDataDirUrl, "profiles.update");
      Object.assign(payload, {
        userDataDir: url,
        userDataDirUrl: url,
      });
    }

    const raw = await runProfilesUpdate(steel, args.externalId, payload);
    if (!raw || typeof raw !== "object") {
      throw normalizeError(
        "Invalid response from Steel profiles.update",
        "profiles.update",
      );
    }

    const metadata = normalizeProfileMetadata(raw as JsonObject, ownerId, Date.now());
    await runWithNormalizedError("profiles.upsert", () =>
      ctx.runMutation(internal.profiles.upsert, metadata),
    );

    return metadata;
  },
});

export const profiles = {
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "profiles.list");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "profiles.list" },
      );
      const raw = await runProfilesList(steel);
      const normalizedList = normalizeListResponse("profiles.list", raw);

      const items = [] as ProfileMetadata[];
      const syncedAt = Date.now();
      for (const item of normalizedList.items) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const metadata = normalizeProfileMetadata(item as JsonObject, ownerId, syncedAt);
        await runWithNormalizedError("profiles.upsert", () =>
          ctx.runMutation(internal.profiles.upsert, metadata),
        );
        items.push(metadata);
      }

      return {
        items,
        hasMore: normalizedList.hasMore,
        continuation: normalizedList.continuation,
      };
    },
  }),
  get: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "profiles.get");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "profiles.get" },
      );
      const syncedAt = Date.now();
      const raw = await runProfilesGet(steel, args.externalId);

      if (!raw || typeof raw !== "object") {
        throw normalizeError("Invalid response from Steel profiles.get", "profiles.get");
      }

      const metadata = normalizeProfileMetadata(raw as JsonObject, ownerId, syncedAt);
      await runWithNormalizedError("profiles.upsert", () =>
        ctx.runMutation(internal.profiles.upsert, metadata),
      );

      return metadata;
    },
  }),
  create: createAction,
  update: updateAction,
  // Backwards-compatible aliases.
  createFromUrl: createAction,
  updateFromUrl: updateAction,
  upsert: upsertProfileMetadata,
};

export const list = profiles.list;
export const get = profiles.get;
export const create = profiles.create;
export const update = profiles.update;
export const createFromUrl = profiles.createFromUrl;
export const updateFromUrl = profiles.updateFromUrl;
export const upsert = profiles.upsert;
