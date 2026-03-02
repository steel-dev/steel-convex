import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelExtensionsClient = {
  extensions?: {
    list?: () => Promise<unknown>;
    upload?: (payload?: Record<string, unknown>) => Promise<unknown>;
    update?: (id: string, payload?: Record<string, unknown>) => Promise<unknown>;
    delete?: (id: string) => Promise<unknown>;
    deleteAll?: () => Promise<unknown>;
    download?: (id: string) => Promise<unknown>;
  };
};

interface ExtensionMetadata {
  externalId: string;
  ownerId: string;
  lastSyncedAt: number;
  name?: string;
  version?: string;
  description?: string;
  sourceUrl?: string;
  checksum?: string;
  enabled?: boolean;
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

const pickFirstBoolean = (value: JsonObject, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "boolean") {
      return candidate;
    }
  }

  return undefined;
};

const normalizeUrlInput = (value: unknown, operation: string): string => {
  if (typeof value !== "string") {
    throw normalizeError(`URL must be a string for ${operation}`, operation);
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    throw normalizeError(`URL must be a non-empty string for ${operation}`, operation);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }

    return parsed.toString();
  } catch {
    throw normalizeError(`URL must be a valid HTTP(S) URL for ${operation}`, operation);
  }
};

const normalizeExtensionArgs = (
  args: Record<string, unknown> | undefined,
  operation: string,
): Record<string, unknown> => {
  if (!args) {
    return {};
  }

  if (typeof args !== "object" || Array.isArray(args)) {
    throw normalizeError(`Invalid extension args for ${operation}`, operation);
  }

  return { ...args };
};

const buildExtensionPayload = (
  args: {
    extensionArgs?: Record<string, unknown>;
    url?: string;
    file?: string;
  },
  operation: string,
): Record<string, unknown> => {
  const payload = normalizeExtensionArgs(args.extensionArgs, operation);

  if (args.url !== undefined) {
    payload.url = normalizeUrlInput(args.url, operation);
  }

  if (args.file !== undefined) {
    const file = args.file.trim();
    if (!file.length) {
      throw normalizeError(`file must be a non-empty string for ${operation}`, operation);
    }
    payload.file = file;
  }

  return payload;
};

const normalizeExtensionMetadata = (
  payload: JsonObject,
  ownerId: string,
  syncedAt: number,
): ExtensionMetadata => {
  const externalId = pickFirstString(payload, ["externalId", "extensionId", "id", "_id"]);
  if (!externalId) {
    throw normalizeError("Extension payload missing externalId", "extensions.normalize");
  }

  const sourceUrl = pickFirstString(payload, [
    "url",
    "sourceUrl",
    "source_url",
    "downloadUrl",
    "download_url",
  ]);

  return {
    externalId,
    ownerId,
    lastSyncedAt: syncedAt,
    name: pickFirstString(payload, ["name", "extensionName", "title"]),
    version: pickFirstString(payload, ["version", "versionName"]),
    description: pickFirstString(payload, ["description", "summary", "notes"]),
    sourceUrl,
    checksum: pickFirstString(payload, ["checksum", "hash", "digest"]),
    enabled: pickFirstBoolean(payload, ["enabled", "isEnabled"]),
  };
};

const normalizeListResponse = (
  operation: string,
  response: unknown,
): { items: JsonObject[]; hasMore: boolean; continuation?: string } => {
  if (!response) {
    throw normalizeError(`Invalid response from Steel extensions.list`, operation);
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
  } else if (Array.isArray(envelope.extensions)) {
    items = envelope.extensions;
  } else if (Array.isArray(envelope.results)) {
    items = envelope.results;
  } else if (Array.isArray(envelope.data)) {
    items = envelope.data;
  } else {
    throw normalizeError(`Invalid response from Steel extensions.list`, operation);
  }

  const continuation = ["continueCursor", "nextCursor", "next_cursor", "cursor", "pageCursor"]
    .map((key) => (typeof envelope[key] === "string" ? String(envelope[key]) : undefined))
    .find((value) => value !== undefined);

  const hasMore = typeof envelope.hasMore === "boolean" ? envelope.hasMore : continuation !== undefined;

  return {
    items: items as JsonObject[],
    hasMore,
    continuation,
  };
};

const runExtensionsList = async (
  steel: ReturnType<typeof createSteelClient>,
) => {
  const client = steel as SteelExtensionsClient;
  const listMethod = client.extensions?.list;
  if (!listMethod) {
    throw normalizeError("Steel extensions.list is not available", "extensions.list");
  }

  return runWithNormalizedError("extensions.list", () => listMethod());
};

const runExtensionsUpload = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelExtensionsClient;
  const uploadMethod = client.extensions?.upload;
  if (!uploadMethod) {
    throw normalizeError("Steel extensions.upload is not available", "extensions.upload");
  }

  return runWithNormalizedError("extensions.upload", () => uploadMethod(payload));
};

const runExtensionsUpdate = async (
  steel: ReturnType<typeof createSteelClient>,
  externalId: string,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelExtensionsClient;
  const updateMethod = client.extensions?.update;
  if (!updateMethod) {
    throw normalizeError("Steel extensions.update is not available", "extensions.update");
  }

  return runWithNormalizedError("extensions.update", () => updateMethod(externalId, payload));
};

const runExtensionsDelete = async (
  steel: ReturnType<typeof createSteelClient>,
  externalId: string,
) => {
  const client = steel as SteelExtensionsClient;
  const deleteMethod = client.extensions?.delete;
  if (!deleteMethod) {
    throw normalizeError("Steel extensions.delete is not available", "extensions.delete");
  }

  return runWithNormalizedError("extensions.delete", () => deleteMethod(externalId));
};

const runExtensionsDeleteAll = async (steel: ReturnType<typeof createSteelClient>) => {
  const client = steel as SteelExtensionsClient;
  const deleteAllMethod = client.extensions?.deleteAll;
  if (!deleteAllMethod) {
    throw normalizeError("Steel extensions.deleteAll is not available", "extensions.deleteAll");
  }

  return runWithNormalizedError("extensions.deleteAll", () => deleteAllMethod());
};

const runExtensionsDownload = async (
  steel: ReturnType<typeof createSteelClient>,
  externalId: string,
) => {
  const client = steel as SteelExtensionsClient;
  const downloadMethod = client.extensions?.download;
  if (!downloadMethod) {
    throw normalizeError("Steel extensions.download is not available", "extensions.download");
  }

  return runWithNormalizedError("extensions.download", () => downloadMethod(externalId));
};

const upsertExtensionMetadata = internalMutation({
  args: {
    externalId: v.string(),
    name: v.optional(v.string()),
    version: v.optional(v.string()),
    description: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    checksum: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    ownerId: v.string(),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("extensions")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing && existing.ownerId && existing.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing extension metadata",
        "extensions.upsert",
      );
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, args);
      return;
    }

    await ctx.db.insert("extensions", args);
  },
});

const deleteExtensionMetadata = internalMutation({
  args: {
    externalId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("extensions")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!existing) {
      return;
    }

    if (existing.ownerId && existing.ownerId !== args.ownerId) {
      throw normalizeError("ownerId mismatch for extension delete", "extensions.delete");
    }

    await ctx.db.delete(existing._id);
  },
});

const deleteAllExtensionMetadata = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("extensions")
      .withIndex("byOwnerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    for (const record of records) {
      if (record.ownerId && record.ownerId !== args.ownerId) {
        throw normalizeError(
          "ownerId mismatch for extension bulk delete",
          "extensions.deleteAll",
        );
      }

      await ctx.db.delete(record._id);
    }
  },
});

const uploadAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    url: v.optional(v.string()),
    file: v.optional(v.string()),
    extensionArgs: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "extensions.upload");
    const steel = createSteelClient(
      { apiKey: args.apiKey },
      { operation: "extensions.upload" },
    );

    const payload = buildExtensionPayload(
      {
        extensionArgs: args.extensionArgs,
        url: args.url,
        file: args.file,
      },
      "extensions.upload",
    );

    const rawResult = await runExtensionsUpload(steel, payload);

    if (!rawResult || typeof rawResult !== "object") {
      throw normalizeError(
        "Invalid response from Steel extensions.upload",
        "extensions.upload",
      );
    }

    const metadata = normalizeExtensionMetadata(rawResult as JsonObject, ownerId, Date.now());
    await runWithNormalizedError("extensions.upsert", () =>
      ctx.runMutation(internal.extensions.upsert, metadata),
    );

    return metadata;
  },
});

const updateAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    externalId: v.string(),
    url: v.optional(v.string()),
    file: v.optional(v.string()),
    extensionArgs: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "extensions.update");
    const steel = createSteelClient(
      { apiKey: args.apiKey },
      { operation: "extensions.update" },
    );

    const payload = buildExtensionPayload(
      {
        extensionArgs: args.extensionArgs,
        url: args.url,
        file: args.file,
      },
      "extensions.update",
    );

    const rawResult = await runExtensionsUpdate(steel, args.externalId, payload);
    if (!rawResult || typeof rawResult !== "object") {
      throw normalizeError(
        "Invalid response from Steel extensions.update",
        "extensions.update",
      );
    }

    const metadata = normalizeExtensionMetadata(rawResult as JsonObject, ownerId, Date.now());
    await runWithNormalizedError("extensions.upsert", () =>
      ctx.runMutation(internal.extensions.upsert, metadata),
    );

    return metadata;
  },
});

export const extensions = {
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "extensions.list");
      const syncedAt = Date.now();

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "extensions.list" },
      );
      const raw = await runExtensionsList(steel);
      const normalizedList = normalizeListResponse("extensions.list", raw);

      const items = [] as ExtensionMetadata[];
      for (const item of normalizedList.items) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const metadata = normalizeExtensionMetadata(item as JsonObject, ownerId, syncedAt);
        await runWithNormalizedError("extensions.upsert", () =>
          ctx.runMutation(internal.extensions.upsert, metadata),
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
  upload: uploadAction,
  update: updateAction,
  // Backwards-compatible aliases.
  uploadFromUrl: uploadAction,
  updateFromUrl: updateAction,
  delete: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "extensions.delete");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "extensions.delete" },
      );

      const result = await runExtensionsDelete(steel, args.externalId);
      await runWithNormalizedError("extensions.delete", () =>
        ctx.runMutation(internal.extensions.deleteOne, {
          externalId: args.externalId,
          ownerId,
        }),
      );

      return result;
    },
  }),
  deleteAll: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "extensions.deleteAll");

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "extensions.deleteAll" },
      );
      const result = await runExtensionsDeleteAll(steel);

      await runWithNormalizedError("extensions.deleteAll", () =>
        ctx.runMutation(internal.extensions.deleteAllForOwner, {
          ownerId,
        }),
      );

      return result;
    },
  }),
  download: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      externalId: v.string(),
    },
    handler: async (_ctx, args) => {
      requireOwnerId(args.ownerId, "extensions.download");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "extensions.download" },
      );

      return runExtensionsDownload(steel, args.externalId);
    },
  }),
  upsert: upsertExtensionMetadata,
  deleteOne: deleteExtensionMetadata,
  deleteAllForOwner: deleteAllExtensionMetadata,
};

const extensionsDelete = extensions.delete;

export const list = extensions.list;
export const upload = extensions.upload;
export const update = extensions.update;
export const uploadFromUrl = extensions.uploadFromUrl;
export const updateFromUrl = extensions.updateFromUrl;
export { extensionsDelete as delete };
export const deleteAll = extensions.deleteAll;
export const download = extensions.download;
export const upsert = extensions.upsert;
export const deleteOne = extensions.deleteOne;
export const deleteAllForOwner = extensions.deleteAllForOwner;
