import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelSessionFilesClient = {
  sessions?: {
    files?: {
      list?: (sessionId: string) => Promise<unknown>;
      upload?: (sessionId: string, body: Record<string, unknown>) => Promise<unknown>;
      delete?: (sessionId: string, path: string) => Promise<unknown>;
      deleteAll?: (sessionId: string) => Promise<unknown>;
    };
  };
};

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

const pickFirstNumber = (value: JsonObject, keys: string[]): number | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
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

const normalizeSessionFileMetadata = (
  raw: JsonObject,
  sessionExternalId: string,
  ownerId: string,
  syncedAt: number,
): {
  sessionExternalId: string;
  path: string;
  size: number;
  lastModified: number;
  ownerId: string;
  lastSyncedAt: number;
} => {
  const path = pickFirstString(raw, ["path", "filePath", "file_path", "name", "filename"]);
  if (!path) {
    throw normalizeError("Session file metadata missing path", "sessionFiles.normalizeMetadata");
  }

  const size = pickFirstNumber(raw, ["size", "byteCount", "bytes"]) ?? 0;
  const lastModified =
    pickFirstTimestamp(raw, ["lastModified", "last_modified", "modifiedAt", "modified_at"]) ??
    syncedAt;

  return {
    sessionExternalId,
    path,
    size,
    lastModified,
    ownerId,
    lastSyncedAt: syncedAt,
  };
};

const normalizeListResponse = (
  operation: string,
  response: unknown,
): { items: JsonObject[]; hasMore: boolean; continuation?: string } => {
  if (!response) {
    throw normalizeError(`Invalid response from Steel sessions.files.list`, operation);
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
  } else if (Array.isArray(envelope.files)) {
    items = envelope.files;
  } else if (Array.isArray(envelope.results)) {
    items = envelope.results;
  } else if (Array.isArray(envelope.data)) {
    items = envelope.data;
  } else {
    throw normalizeError(`Invalid response from Steel sessions.files.list`, operation);
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

const normalizeUploadPayload = (
  args: {
    file?: string;
    url?: string;
    path?: string;
    fileArgs?: Record<string, unknown>;
  },
  operation: string,
): Record<string, unknown> => {
  const file = typeof args.file === "string" && args.file.trim().length > 0 ? args.file.trim() : undefined;
  const url = typeof args.url === "string" && args.url.trim().length > 0 ? args.url.trim() : undefined;
  const source = file ?? url;

  if (!source) {
    throw normalizeError(`${operation} requires either file or url`, operation);
  }

  return {
    ...(args.fileArgs ?? {}),
    file: source,
    ...(args.path ? { path: args.path } : {}),
  };
};

const upsertSessionFileMetadata = internalMutation({
  args: {
    sessionExternalId: v.string(),
    path: v.string(),
    size: v.number(),
    lastModified: v.number(),
    ownerId: v.string(),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("sessionFileMetadata")
      .withIndex("bySessionExternalIdAndPath", (q) =>
        q
          .eq("sessionExternalId", args.sessionExternalId)
          .eq("path", args.path),
      )
      .unique();

    if (current && current.ownerId && current.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing local session file record",
        "sessionFiles.upsert",
      );
    }

    if (current !== null) {
      await ctx.db.patch(current._id, {
        sessionExternalId: args.sessionExternalId,
        path: args.path,
        size: args.size,
        lastModified: args.lastModified,
        ownerId: args.ownerId,
        lastSyncedAt: args.lastSyncedAt,
      });
      return;
    }

    await ctx.db.insert("sessionFileMetadata", args);
  },
});

const deleteSessionFileMetadata = internalMutation({
  args: {
    sessionExternalId: v.string(),
    path: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("sessionFileMetadata")
      .withIndex("bySessionExternalIdAndPath", (q) =>
        q
          .eq("sessionExternalId", args.sessionExternalId)
          .eq("path", args.path),
      )
      .unique();

    if (!record) {
      return;
    }

    if (record.ownerId && record.ownerId !== args.ownerId) {
      throw normalizeError("ownerId mismatch for session file delete", "sessionFiles.delete");
    }

    await ctx.db.delete(record._id);
  },
});

const deleteAllSessionFileMetadata = internalMutation({
  args: {
    sessionExternalId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("sessionFileMetadata")
      .withIndex("bySessionExternalId", (q) => q.eq("sessionExternalId", args.sessionExternalId))
      .collect();

    for (const record of records) {
      if (record.ownerId && record.ownerId !== args.ownerId) {
        throw normalizeError(
          "ownerId mismatch for session file bulk delete",
          "sessionFiles.deleteAll",
        );
      }

      await ctx.db.delete(record._id);
    }
  },
});

const runSessionFilesList = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
) => {
  const client = steel as SteelSessionFilesClient;
  const listMethod = client.sessions?.files?.list;
  if (!listMethod) {
    throw normalizeError("Steel sessions.files.list is not available", "sessionFiles.list");
  }

  return runWithNormalizedError("sessionFiles.list", () => listMethod(sessionExternalId));
};

const runSessionFilesUpload = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelSessionFilesClient;
  const uploadMethod = client.sessions?.files?.upload;
  if (!uploadMethod) {
    throw normalizeError("Steel sessions.files.upload is not available", "sessionFiles.upload");
  }

  return runWithNormalizedError("sessionFiles.upload", () => uploadMethod(sessionExternalId, payload));
};

const runSessionFilesDelete = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
  path: string,
) => {
  const client = steel as SteelSessionFilesClient;
  const deleteMethod = client.sessions?.files?.delete;
  if (!deleteMethod) {
    throw normalizeError("Steel sessions.files.delete is not available", "sessionFiles.delete");
  }

  return runWithNormalizedError("sessionFiles.delete", () => deleteMethod(sessionExternalId, path));
};

const runSessionFilesDeleteAll = async (
  steel: ReturnType<typeof createSteelClient>,
  sessionExternalId: string,
) => {
  const client = steel as SteelSessionFilesClient;
  const deleteAllMethod = client.sessions?.files?.deleteAll;
  if (!deleteAllMethod) {
    throw normalizeError("Steel sessions.files.deleteAll is not available", "sessionFiles.deleteAll");
  }

  return runWithNormalizedError("sessionFiles.deleteAll", () => deleteAllMethod(sessionExternalId));
};

const uploadAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    sessionExternalId: v.string(),
    file: v.optional(v.string()),
    url: v.optional(v.string()),
    path: v.optional(v.string()),
    fileArgs: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "sessionFiles.upload");
    const syncedAt = Date.now();

    const steel = createSteelClient(
      { apiKey: args.apiKey },
      { operation: "sessionFiles.upload" },
    );

    const payload = normalizeUploadPayload(
      {
        file: args.file,
        url: args.url,
        path: args.path,
        fileArgs: args.fileArgs,
      },
      "sessionFiles.upload",
    );

    const rawResult = await runSessionFilesUpload(steel, args.sessionExternalId, payload);

    if (rawResult && typeof rawResult === "object") {
      const metadata = normalizeSessionFileMetadata(
        rawResult as JsonObject,
        args.sessionExternalId,
        ownerId,
        syncedAt,
      );

      await runWithNormalizedError("sessionFiles.upsert", () =>
        ctx.runMutation(internal.sessionFiles.upsert, metadata),
      );

      return metadata;
    }

    return rawResult;
  },
});

export const sessionFiles = {
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessionFiles.list");
      const syncedAt = Date.now();

      const steel = createSteelClient({ apiKey: args.apiKey }, { operation: "sessionFiles.list" });
      const raw = await runSessionFilesList(steel, args.sessionExternalId);
      const normalizedList = normalizeListResponse("sessionFiles.list", raw);

      const items = [] as ReturnType<typeof normalizeSessionFileMetadata>[];
      for (const item of normalizedList.items) {
        if (typeof item !== "object" || item === null) {
          continue;
        }

        const metadata = normalizeSessionFileMetadata(item, args.sessionExternalId, ownerId, syncedAt);
        await runWithNormalizedError("sessionFiles.upsert", () =>
          ctx.runMutation(internal.sessionFiles.upsert, metadata),
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
  // Backwards-compatible alias.
  uploadFromUrl: uploadAction,
  delete: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      sessionExternalId: v.string(),
      path: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessionFiles.delete");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "sessionFiles.delete" },
      );

      const result = await runSessionFilesDelete(steel, args.sessionExternalId, args.path);

      await runWithNormalizedError("sessionFiles.delete", () =>
        ctx.runMutation(internal.sessionFiles.deleteOne, {
          sessionExternalId: args.sessionExternalId,
          path: args.path,
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
      sessionExternalId: v.string(),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "sessionFiles.deleteAll");

      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "sessionFiles.deleteAll" },
      );

      const result = await runSessionFilesDeleteAll(steel, args.sessionExternalId);

      await runWithNormalizedError("sessionFiles.deleteAll", () =>
        ctx.runMutation(internal.sessionFiles.deleteAllForSession, {
          sessionExternalId: args.sessionExternalId,
          ownerId,
        }),
      );

      return result;
    },
  }),
  upsert: upsertSessionFileMetadata,
  deleteOne: deleteSessionFileMetadata,
  deleteAllForSession: deleteAllSessionFileMetadata,
};

const sessionFilesDelete = sessionFiles.delete;

export const list = sessionFiles.list;
export const upload = sessionFiles.upload;
export const uploadFromUrl = sessionFiles.uploadFromUrl;
export { sessionFilesDelete as delete };
export const deleteAll = sessionFiles.deleteAll;
export const upsert = sessionFiles.upsert;
export const deleteOne = sessionFiles.deleteOne;
export const deleteAllForSession = sessionFiles.deleteAllForSession;
