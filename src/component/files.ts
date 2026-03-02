import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelFilesClient = {
  files?: {
    list?: () => Promise<unknown>;
    upload?: (payload: Record<string, unknown>) => Promise<unknown>;
    delete?: (path: string) => Promise<unknown>;
    download?: (path: string) => Promise<unknown>;
  };
};

interface GlobalFileMetadata {
  externalId: string;
  ownerId: string;
  path: string;
  name?: string;
  size?: number;
  lastModified?: number;
  sourceUrl?: string;
  mimeType?: string;
  lastSyncedAt: number;
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

const pickFirstNumber = (value: JsonObject, keys: string[]): number | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
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

const normalizeFileMetadata = (
  raw: JsonObject,
  ownerId: string,
  syncedAt: number,
): GlobalFileMetadata => {
  const path = pickFirstString(raw, ["path", "filePath", "file_path", "id", "externalId"]);
  if (!path) {
    throw normalizeError("Global file payload missing path", "files.normalizeMetadata");
  }

  return {
    externalId: path,
    ownerId,
    path,
    name: pickFirstString(raw, ["name", "fileName", "filename"]),
    size: pickFirstNumber(raw, ["size", "byteCount", "bytes"]),
    lastModified: pickFirstTimestamp(raw, [
      "lastModified",
      "last_modified",
      "modifiedAt",
      "modified_at",
      "updatedAt",
      "updated_at",
    ]),
    sourceUrl: pickFirstString(raw, ["url", "sourceUrl", "source_url", "href"]),
    mimeType: pickFirstString(raw, ["mimeType", "mime_type", "contentType", "content_type"]),
    lastSyncedAt: syncedAt,
  };
};

const normalizeListResponse = (
  operation: string,
  response: unknown,
): { items: JsonObject[]; hasMore: boolean; continuation?: string } => {
  if (!response) {
    throw normalizeError(`Invalid response from Steel files.list`, operation);
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
    throw normalizeError(`Invalid response from Steel files.list`, operation);
  }

  const continuation = ["continueCursor", "nextCursor", "next_cursor", "cursor", "pageCursor"]
    .map((key) => (typeof envelope[key] === "string" ? String(envelope[key]) : undefined))
    .find((candidate) => candidate !== undefined);

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

const resolveFilePath = (
  path: string | undefined,
  externalId: string | undefined,
  operation: string,
): string => {
  const resolved = (path ?? externalId)?.trim();
  if (!resolved) {
    throw normalizeError(`${operation} requires path`, operation);
  }

  return resolved;
};

const upsertGlobalFileMetadata = internalMutation({
  args: {
    externalId: v.string(),
    ownerId: v.string(),
    name: v.optional(v.string()),
    path: v.optional(v.string()),
    size: v.optional(v.number()),
    lastModified: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("globalFiles")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (current && current.ownerId && current.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing global file record",
        "files.upsert",
      );
    }

    if (current !== null) {
      await ctx.db.patch(current._id, args);
      return;
    }

    await ctx.db.insert("globalFiles", args);
  },
});

const deleteGlobalFileMetadata = internalMutation({
  args: {
    externalId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("globalFiles")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!existing) {
      return;
    }

    if (existing.ownerId && existing.ownerId !== args.ownerId) {
      throw normalizeError("ownerId mismatch for global file delete", "files.delete");
    }

    await ctx.db.delete(existing._id);
  },
});

const runFilesList = async (steel: ReturnType<typeof createSteelClient>) => {
  const client = steel as SteelFilesClient;
  const method = client.files?.list;
  if (!method) {
    throw normalizeError("Steel files.list is not available", "files.list");
  }

  return runWithNormalizedError("files.list", () => method());
};

const runFilesUpload = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelFilesClient;
  const method = client.files?.upload;
  if (!method) {
    throw normalizeError("Steel files.upload is not available", "files.upload");
  }

  return runWithNormalizedError("files.upload", () => method(payload));
};

const runFilesDelete = async (
  steel: ReturnType<typeof createSteelClient>,
  path: string,
) => {
  const client = steel as SteelFilesClient;
  const method = client.files?.delete;
  if (!method) {
    throw normalizeError("Steel files.delete is not available", "files.delete");
  }

  return runWithNormalizedError("files.delete", () => method(path));
};

const runFilesDownload = async (
  steel: ReturnType<typeof createSteelClient>,
  path: string,
) => {
  const client = steel as SteelFilesClient;
  const method = client.files?.download;
  if (!method) {
    throw normalizeError("Steel files.download is not available", "files.download");
  }

  return runWithNormalizedError("files.download", () => method(path));
};

const toBase64 = (arrayBuffer: ArrayBuffer): string => {
  const globalBuffer = globalThis as unknown as { Buffer?: { from: (buffer: ArrayBuffer) => { toString: (encoding: string) => string } } };
  if (globalBuffer.Buffer) {
    return globalBuffer.Buffer.from(arrayBuffer).toString("base64");
  }

  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  if (typeof btoa === "function") {
    return btoa(binary);
  }

  throw normalizeError("No base64 encoder available for files.download", "files.download");
};

const normalizeDownloadResponse = async (
  response: unknown,
): Promise<{ base64: string; contentType?: string; status?: number; ok?: boolean }> => {
  if (!response || typeof response !== "object") {
    throw normalizeError("Invalid response from Steel files.download", "files.download");
  }

  const maybeResponse = response as {
    arrayBuffer?: () => Promise<ArrayBuffer>;
    headers?: { get?: (name: string) => string | null };
    status?: number;
    ok?: boolean;
  };

  if (typeof maybeResponse.arrayBuffer !== "function") {
    throw normalizeError("Steel files.download response is not binary", "files.download");
  }

  const bytes = await maybeResponse.arrayBuffer();
  const contentType = maybeResponse.headers?.get?.("content-type") ?? undefined;

  return {
    base64: toBase64(bytes),
    ...(typeof contentType === "string" ? { contentType } : {}),
    ...(typeof maybeResponse.status === "number" ? { status: maybeResponse.status } : {}),
    ...(typeof maybeResponse.ok === "boolean" ? { ok: maybeResponse.ok } : {}),
  };
};

const uploadAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    file: v.optional(v.string()),
    url: v.optional(v.string()),
    path: v.optional(v.string()),
    fileArgs: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const ownerId = requireOwnerId(args.ownerId, "files.upload");
    const syncedAt = Date.now();
    const steel = createSteelClient(
      { apiKey: args.apiKey },
      { operation: "files.upload" },
    );

    const payload = normalizeUploadPayload(
      {
        file: args.file,
        url: args.url,
        path: args.path,
        fileArgs: args.fileArgs,
      },
      "files.upload",
    );

    const rawResult = await runFilesUpload(steel, payload);
    if (!rawResult || typeof rawResult !== "object") {
      throw normalizeError(
        "Invalid response from Steel files.upload",
        "files.upload",
      );
    }

    const metadata = normalizeFileMetadata(rawResult as JsonObject, ownerId, syncedAt);
    await runWithNormalizedError("files.upsert", () =>
      ctx.runMutation(internal.files.upsert, metadata),
    );

    return metadata;
  },
});

const downloadAction = action({
  args: {
    apiKey: v.string(),
    ownerId: v.optional(v.string()),
    path: v.optional(v.string()),
    externalId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    requireOwnerId(args.ownerId, "files.download");
    const steel = createSteelClient(
      { apiKey: args.apiKey },
      { operation: "files.download" },
    );

    const path = resolveFilePath(args.path, args.externalId, "files.download");
    const raw = await runFilesDownload(steel, path);
    return normalizeDownloadResponse(raw);
  },
});

export const files = {
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "files.list");
      const steel = createSteelClient({ apiKey: args.apiKey }, { operation: "files.list" });
      const raw = await runFilesList(steel);
      const normalizedList = normalizeListResponse("files.list", raw);
      const syncedAt = Date.now();

      const items = [] as GlobalFileMetadata[];
      for (const item of normalizedList.items) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const normalized = normalizeFileMetadata(item as JsonObject, ownerId, syncedAt);
        await runWithNormalizedError("files.upsert", () =>
          ctx.runMutation(internal.files.upsert, normalized),
        );
        items.push(normalized);
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
      path: v.optional(v.string()),
      externalId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "files.delete");
      const path = resolveFilePath(args.path, args.externalId, "files.delete");

      const steel = createSteelClient({ apiKey: args.apiKey }, { operation: "files.delete" });
      const result = await runFilesDelete(steel, path);

      await runWithNormalizedError("files.delete", () =>
        ctx.runMutation(internal.files.deleteOne, {
          externalId: path,
          ownerId,
        }),
      );

      return result;
    },
  }),
  download: downloadAction,
  // Backwards-compatible alias.
  downloadToStorage: downloadAction,
  upsert: upsertGlobalFileMetadata,
  deleteOne: deleteGlobalFileMetadata,
};

const filesDelete = files.delete;

export const list = files.list;
export const upload = files.upload;
export const uploadFromUrl = files.uploadFromUrl;
export { filesDelete as delete };
export const download = files.download;
export const downloadToStorage = files.downloadToStorage;
export const upsert = files.upsert;
export const deleteOne = files.deleteOne;
