import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { createSteelClient } from "./steel";
import { normalizeError, normalizeOwnerId } from "./normalize";

type JsonObject = Record<string, unknown>;

type SteelCredentialsClient = {
  credentials?: {
    create?: (args: Record<string, unknown>) => Promise<unknown>;
    update?: (args?: Record<string, unknown>) => Promise<unknown>;
    list?: (query?: Record<string, unknown>) => Promise<unknown>;
    delete?: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

interface CredentialMetadata {
  externalId: string;
  name?: string;
  service?: string;
  type?: string;
  username?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  origin?: string;
  namespace?: string;
  createdAt?: number;
  updatedAt?: number;
  ownerId: string;
  lastSyncedAt: number;
}

const SECRET_KEY_MARKERS = [
  "secret",
  "password",
  "token",
  "apikey",
  "api_key",
  "access_token",
  "refresh_token",
  "private_key",
  "client_secret",
  "credential",
  "value",
];

const requireOwnerId = (ownerId: string | undefined, operation: string): string => {
  const normalized = normalizeOwnerId(ownerId);
  if (!normalized) {
    throw normalizeError(`Missing ownerId: ownerId is required for ${operation}`, operation);
  }

  return normalized;
};

const normalizeWithError = <T>(operation: string, handler: () => T): T => {
  try {
    return handler();
  } catch (error) {
    throw normalizeError(error, operation);
  }
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

const isSecretKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  const withoutSeparators = normalized.replace(/[-_]/g, "");
  return SECRET_KEY_MARKERS.some(
    (marker) => normalized.includes(marker) || withoutSeparators.includes(marker),
  );
};

const sanitizeSecretValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSecretValues(item));
  }

  if (value !== null && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(objectValue)) {
      if (isSecretKey(key)) {
        continue;
      }
      sanitized[key] = sanitizeSecretValues(objectValue[key]);
    }
    return sanitized;
  }

  return value;
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

const pickFirstObject = (
  value: JsonObject,
  keys: string[],
): Record<string, unknown> | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
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

const normalizeCredentialArgs = (args: Record<string, unknown> | undefined, operation: string) => {
  if (!args) {
    return {};
  }

  if (typeof args !== "object" || Array.isArray(args)) {
    throw normalizeError(`Invalid credential args for ${operation}`, operation);
  }

  return { ...args };
};

const normalizeCredentialExternalId = (
  namespace: string | undefined,
  origin: string | undefined,
  label: string | undefined,
): string => {
  return `${namespace ?? "default"}::${origin ?? "*"}::${label ?? "*"}`;
};

const parseCredentialExternalId = (
  externalId: string,
): { namespace?: string; origin?: string; label?: string } => {
  const [namespace, origin, label] = externalId.split("::");
  return {
    namespace: namespace && namespace !== "default" ? namespace : undefined,
    origin: origin && origin !== "*" ? origin : undefined,
    label: label && label !== "*" ? label : undefined,
  };
};

const normalizeCredentialMetadata = (
  payload: JsonObject,
  ownerId: string,
  syncedAt: number,
  fallback?: {
    namespace?: string;
    origin?: string;
    label?: string;
    metadata?: Record<string, unknown>;
  },
): CredentialMetadata => {
  const namespace = pickFirstString(payload, ["namespace"]) ?? fallback?.namespace;
  const origin = pickFirstString(payload, ["origin"]) ?? fallback?.origin;
  const label = pickFirstString(payload, ["label", "name", "credentialName"]) ?? fallback?.label;

  const rawMetadata = pickFirstObject(payload, ["metadata", "meta", "details", "extra"]);
  const metadataSource = rawMetadata ?? fallback?.metadata;
  const sanitizedMetadata = metadataSource && Object.keys(metadataSource).length > 0
    ? (sanitizeSecretValues(metadataSource) as Record<string, unknown>)
    : undefined;

  const externalId = normalizeCredentialExternalId(namespace, origin, label);

  return {
    externalId,
    name: label,
    service: origin,
    type: pickFirstString(payload, ["type", "kind"]),
    username: pickFirstString(payload, ["username", "user", "login"]),
    description: pickFirstString(payload, ["description", "summary"]),
    metadata: sanitizedMetadata,
    origin,
    namespace,
    createdAt: pickFirstTimestamp(payload, ["createdAt", "created_at", "created"]),
    updatedAt: pickFirstTimestamp(payload, ["updatedAt", "updated_at", "updated"]),
    ownerId,
    lastSyncedAt: syncedAt,
  };
};

const normalizeListResponse = (
  operation: string,
  response: unknown,
): JsonObject[] => {
  if (!response) {
    throw normalizeError(`Invalid response from Steel credentials.list`, operation);
  }

  if (Array.isArray(response)) {
    return response.filter((item): item is JsonObject => typeof item === "object" && item !== null);
  }

  const envelope = response as JsonObject;
  if (Array.isArray(envelope.credentials)) {
    return envelope.credentials.filter((item): item is JsonObject => typeof item === "object" && item !== null);
  }

  if (Array.isArray(envelope.items)) {
    return envelope.items.filter((item): item is JsonObject => typeof item === "object" && item !== null);
  }

  if (Array.isArray(envelope.results)) {
    return envelope.results.filter((item): item is JsonObject => typeof item === "object" && item !== null);
  }

  if (Array.isArray(envelope.data)) {
    return envelope.data.filter((item): item is JsonObject => typeof item === "object" && item !== null);
  }

  throw normalizeError(`Invalid response from Steel credentials.list`, operation);
};

const runCredentialsCreate = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelCredentialsClient;
  const createMethod = client.credentials?.create;
  if (!createMethod) {
    throw normalizeError("Steel credentials.create is not available", "credentials.create");
  }

  return runWithNormalizedError("credentials.create", () => createMethod(payload));
};

const runCredentialsUpdate = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelCredentialsClient;
  const updateMethod = client.credentials?.update;
  if (!updateMethod) {
    throw normalizeError("Steel credentials.update is not available", "credentials.update");
  }

  return runWithNormalizedError("credentials.update", () => updateMethod(payload));
};

const runCredentialsList = async (
  steel: ReturnType<typeof createSteelClient>,
  query: Record<string, unknown>,
) => {
  const client = steel as SteelCredentialsClient;
  const listMethod = client.credentials?.list;
  if (!listMethod) {
    throw normalizeError("Steel credentials.list is not available", "credentials.list");
  }

  return runWithNormalizedError("credentials.list", () => listMethod(query));
};

const runCredentialsDelete = async (
  steel: ReturnType<typeof createSteelClient>,
  payload: Record<string, unknown>,
) => {
  const client = steel as SteelCredentialsClient;
  const deleteMethod = client.credentials?.delete;
  if (!deleteMethod) {
    throw normalizeError("Steel credentials.delete is not available", "credentials.delete");
  }

  return runWithNormalizedError("credentials.delete", () => deleteMethod(payload));
};

const upsertCredentialMetadata = internalMutation({
  args: {
    externalId: v.string(),
    name: v.optional(v.string()),
    service: v.optional(v.string()),
    type: v.optional(v.string()),
    username: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    origin: v.optional(v.string()),
    namespace: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    ownerId: v.string(),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("credentials")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing && existing.ownerId && existing.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for existing local credential record",
        "credentials.upsert",
      );
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return ctx.db.insert("credentials", args);
  },
});

const deleteCredentialMetadata = internalMutation({
  args: {
    externalId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("credentials")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!existing) {
      return;
    }

    if (existing.ownerId && existing.ownerId !== args.ownerId) {
      throw normalizeError(
        "ownerId mismatch for credential delete",
        "credentials.delete",
      );
    }

    await ctx.db.delete(existing._id);
  },
});

const deleteCredentialMetadataByOriginNamespace = internalMutation({
  args: {
    ownerId: v.string(),
    origin: v.string(),
    namespace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("credentials")
      .withIndex("byOwnerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    const targetNamespace = args.namespace ?? "default";

    for (const record of records) {
      if (record.ownerId && record.ownerId !== args.ownerId) {
        throw normalizeError(
          "ownerId mismatch for credential delete",
          "credentials.delete",
        );
      }

      const recordOrigin = record.origin;
      const recordNamespace = record.namespace ?? "default";
      if (recordOrigin === args.origin && recordNamespace === targetNamespace) {
        await ctx.db.delete(record._id);
      }
    }
  },
});

export const credentials = {
  create: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      credentialArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.create");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "credentials.create" },
      );

      const payload = normalizeCredentialArgs(args.credentialArgs, "credentials.create");
      const raw = await runCredentialsCreate(steel, payload);
      if (!raw || typeof raw !== "object") {
        throw normalizeError("Invalid response from Steel credentials.create", "credentials.create");
      }

      const metadata = normalizeWithError("credentials.create", () =>
        normalizeCredentialMetadata(raw as JsonObject, ownerId, Date.now(), {
          namespace: typeof payload.namespace === "string" ? payload.namespace : undefined,
          origin: typeof payload.origin === "string" ? payload.origin : undefined,
          label: typeof payload.label === "string" ? payload.label : undefined,
          metadata: pickFirstObject(payload, ["metadata"]),
        }),
      );

      await runWithNormalizedError("credentials.upsert", () =>
        ctx.runMutation(internal.credentials.upsert, metadata),
      );

      return metadata;
    },
  }),
  update: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      credentialArgs: v.optional(v.record(v.string(), v.any())),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.update");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "credentials.update" },
      );

      const payload = normalizeCredentialArgs(args.credentialArgs, "credentials.update");
      const raw = await runCredentialsUpdate(steel, payload);
      if (!raw || typeof raw !== "object") {
        throw normalizeError("Invalid response from Steel credentials.update", "credentials.update");
      }

      const metadata = normalizeWithError("credentials.update", () =>
        normalizeCredentialMetadata(raw as JsonObject, ownerId, Date.now(), {
          namespace: typeof payload.namespace === "string" ? payload.namespace : undefined,
          origin: typeof payload.origin === "string" ? payload.origin : undefined,
          label: typeof payload.label === "string" ? payload.label : undefined,
          metadata: pickFirstObject(payload, ["metadata"]),
        }),
      );

      await runWithNormalizedError("credentials.upsert", () =>
        ctx.runMutation(internal.credentials.upsert, metadata),
      );

      return metadata;
    },
  }),
  list: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      queryArgs: v.optional(v.record(v.string(), v.any())),
      cursor: v.optional(v.string()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.list");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "credentials.list" },
      );

      const queryArgs = normalizeCredentialArgs(args.queryArgs, "credentials.list");
      const raw = await runCredentialsList(steel, queryArgs);
      const items = normalizeListResponse("credentials.list", raw);
      const syncedAt = Date.now();

      const normalizedItems: CredentialMetadata[] = [];
      for (const item of items) {
        const metadata = normalizeWithError("credentials.list", () =>
          normalizeCredentialMetadata(item, ownerId, syncedAt),
        );
        await runWithNormalizedError("credentials.upsert", () =>
          ctx.runMutation(internal.credentials.upsert, metadata),
        );
        normalizedItems.push(metadata);
      }

      return {
        items: normalizedItems,
        hasMore: false,
      };
    },
  }),
  delete: action({
    args: {
      apiKey: v.string(),
      ownerId: v.optional(v.string()),
      origin: v.optional(v.string()),
      namespace: v.optional(v.string()),
      externalId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const ownerId = requireOwnerId(args.ownerId, "credentials.delete");
      const steel = createSteelClient(
        { apiKey: args.apiKey },
        { operation: "credentials.delete" },
      );

      const derived = args.externalId ? parseCredentialExternalId(args.externalId) : {};
      const origin = (args.origin ?? derived.origin)?.trim();
      if (!origin) {
        throw normalizeError("credentials.delete requires origin", "credentials.delete");
      }

      const namespace = (args.namespace ?? derived.namespace)?.trim() || undefined;
      const payload = {
        origin,
        ...(namespace ? { namespace } : {}),
      };

      const result = await runCredentialsDelete(steel, payload);

      await runWithNormalizedError("credentials.deleteLocal", () =>
        ctx.runMutation(internal.credentials.removeByOriginNamespace, {
          ownerId,
          origin,
          ...(namespace ? { namespace } : {}),
        }),
      );

      return result;
    },
  }),
  upsert: upsertCredentialMetadata,
  remove: deleteCredentialMetadata,
  removeByOriginNamespace: deleteCredentialMetadataByOriginNamespace,
};

const credentialsDelete = credentials.delete;

export const create = credentials.create;
export const update = credentials.update;
export const list = credentials.list;
export { credentialsDelete as delete };
export const upsert = credentials.upsert;
export const remove = credentials.remove;
export const removeByOriginNamespace = credentials.removeByOriginNamespace;
