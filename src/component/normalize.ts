import { sessionStatusValues, type SessionStatus } from "./schema";

const sessionStatusLookup = new Set(sessionStatusValues);

export function normalizeSessionStatus(status: string): SessionStatus {
  if (!sessionStatusLookup.has(status)) {
    throw new Error(`Invalid session status: ${status}`);
  }

  return status as SessionStatus;
}

export function normalizeOwnerId(ownerId?: string): string | undefined {
  const normalized = ownerId?.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized;
}

export function normalizeIncludeRaw(includeRaw: boolean | undefined): boolean {
  return includeRaw ?? false;
}
