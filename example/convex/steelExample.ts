import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { SteelComponent } from "../../src/client/index.js";

const steel = new SteelComponent(
  components.steel as any,
  { STEEL_API_KEY: process.env.STEEL_API_KEY },
);

const normalizeOwnerId = (ownerId: string): string => {
  const normalized = ownerId?.trim();
  if (!normalized) throw new Error("ownerId is required");
  return normalized;
};

export const runLifecycle = action({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const ownerId = normalizeOwnerId(args.ownerId);
    const created = await steel.sessions.create(ctx, { sessionArgs: { timeout: 120000 } }, { ownerId });
    const refreshed = await steel.sessions.refresh(ctx, { externalId: created.externalId }, { ownerId });
    const released = await steel.sessions.release(ctx, { externalId: created.externalId }, { ownerId });
    return { created, refreshed, released };
  },
});

export const listSessions = action({
  args: { ownerId: v.string() },
  handler: async (ctx, args) =>
    steel.sessions.list(ctx, { ownerId: args.ownerId }, { ownerId: normalizeOwnerId(args.ownerId) }),
});

export const createSession = action({
  args: { ownerId: v.string() },
  handler: async (ctx, args) =>
    steel.sessions.create(ctx, { sessionArgs: { timeout: 120000 } }, { ownerId: normalizeOwnerId(args.ownerId) }),
});