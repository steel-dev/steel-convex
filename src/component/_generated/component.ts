/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    captchas: {
      solve: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          commandArgs?: Record<string, any>;
          ownerId?: string;
          pageId?: string;
          sessionExternalId: string;
          taskId?: string;
          url?: string;
        },
        any,
        Name
      >;
      solveImage: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          commandArgs?: Record<string, any>;
          imageXPath: string;
          inputXPath: string;
          ownerId?: string;
          sessionExternalId: string;
          url?: string;
        },
        any,
        Name
      >;
      status: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          ownerId?: string;
          pageId?: string;
          persistSnapshot?: boolean;
          sessionExternalId: string;
        },
        any,
        Name
      >;
    };
    credentials: {
      create: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          credentialArgs?: Record<string, any>;
          ownerId?: string;
        },
        any,
        Name
      >;
      delete: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          externalId?: string;
          namespace?: string;
          origin?: string;
          ownerId?: string;
        },
        any,
        Name
      >;
      list: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          cursor?: string;
          limit?: number;
          ownerId?: string;
          queryArgs?: Record<string, any>;
        },
        any,
        Name
      >;
      update: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          credentialArgs?: Record<string, any>;
          ownerId?: string;
        },
        any,
        Name
      >;
    };
    extensions: {
      delete: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string; ownerId?: string },
        any,
        Name
      >;
      deleteAll: FunctionReference<
        "action",
        "internal",
        { apiKey: string; ownerId?: string },
        any,
        Name
      >;
      download: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string; ownerId?: string },
        any,
        Name
      >;
      list: FunctionReference<
        "action",
        "internal",
        { apiKey: string; cursor?: string; limit?: number; ownerId?: string },
        any,
        Name
      >;
      update: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          extensionArgs?: Record<string, any>;
          externalId: string;
          file?: string;
          ownerId?: string;
          url?: string;
        },
        any,
        Name
      >;
      updateFromUrl: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          extensionArgs?: Record<string, any>;
          externalId: string;
          file?: string;
          ownerId?: string;
          url?: string;
        },
        any,
        Name
      >;
      upload: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          extensionArgs?: Record<string, any>;
          file?: string;
          ownerId?: string;
          url?: string;
        },
        any,
        Name
      >;
      uploadFromUrl: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          extensionArgs?: Record<string, any>;
          file?: string;
          ownerId?: string;
          url?: string;
        },
        any,
        Name
      >;
    };
    files: {
      delete: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          externalId?: string;
          ownerId?: string;
          path?: string;
        },
        any,
        Name
      >;
      download: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          externalId?: string;
          ownerId?: string;
          path?: string;
        },
        any,
        Name
      >;
      downloadToStorage: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          externalId?: string;
          ownerId?: string;
          path?: string;
        },
        any,
        Name
      >;
      list: FunctionReference<
        "action",
        "internal",
        { apiKey: string; cursor?: string; limit?: number; ownerId?: string },
        any,
        Name
      >;
      upload: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          file?: string;
          fileArgs?: Record<string, any>;
          ownerId?: string;
          path?: string;
          url?: string;
        },
        any,
        Name
      >;
      uploadFromUrl: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          file?: string;
          fileArgs?: Record<string, any>;
          ownerId?: string;
          path?: string;
          url?: string;
        },
        any,
        Name
      >;
    };
    profiles: {
      create: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          ownerId?: string;
          profileArgs?: Record<string, any>;
          userDataDirUrl?: string;
        },
        any,
        Name
      >;
      createFromUrl: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          ownerId?: string;
          profileArgs?: Record<string, any>;
          userDataDirUrl?: string;
        },
        any,
        Name
      >;
      get: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string; ownerId?: string },
        any,
        Name
      >;
      list: FunctionReference<
        "action",
        "internal",
        { apiKey: string; cursor?: string; limit?: number; ownerId?: string },
        any,
        Name
      >;
      update: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          externalId: string;
          ownerId?: string;
          profileArgs?: Record<string, any>;
          userDataDirUrl?: string;
        },
        any,
        Name
      >;
      updateFromUrl: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          externalId: string;
          ownerId?: string;
          profileArgs?: Record<string, any>;
          userDataDirUrl?: string;
        },
        any,
        Name
      >;
    };
    sessionFiles: {
      delete: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          ownerId?: string;
          path: string;
          sessionExternalId: string;
        },
        any,
        Name
      >;
      deleteAll: FunctionReference<
        "action",
        "internal",
        { apiKey: string; ownerId?: string; sessionExternalId: string },
        any,
        Name
      >;
      list: FunctionReference<
        "action",
        "internal",
        { apiKey: string; ownerId?: string; sessionExternalId: string },
        any,
        Name
      >;
      upload: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          file?: string;
          fileArgs?: Record<string, any>;
          ownerId?: string;
          path?: string;
          sessionExternalId: string;
          url?: string;
        },
        any,
        Name
      >;
      uploadFromUrl: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          file?: string;
          fileArgs?: Record<string, any>;
          ownerId?: string;
          path?: string;
          sessionExternalId: string;
          url?: string;
        },
        any,
        Name
      >;
    };
    sessions: {
      computer: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          commandArgs: Record<string, any>;
          externalId: string;
          ownerId: string;
        },
        any,
        Name
      >;
      context: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string; ownerId: string },
        any,
        Name
      >;
      create: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          includeRaw?: boolean;
          ownerId: string;
          sessionArgs?: Record<string, any>;
        },
        any,
        Name
      >;
      events: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string; ownerId: string },
        any,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { id: string; ownerId: string },
        any,
        Name
      >;
      getByExternalId: FunctionReference<
        "query",
        "internal",
        { externalId: string; ownerId: string },
        any,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          limit?: number;
          ownerId: string;
          status?: "live" | "released" | "failed";
        },
        any,
        Name
      >;
      liveDetails: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string; ownerId: string },
        any,
        Name
      >;
      refresh: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          externalId: string;
          includeRaw?: boolean;
          ownerId: string;
        },
        any,
        Name
      >;
      refreshMany: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          cursor?: string;
          includeRaw?: boolean;
          limit?: number;
          ownerId: string;
          status?: "live" | "released" | "failed";
        },
        any,
        Name
      >;
      release: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string; ownerId: string },
        any,
        Name
      >;
      releaseAll: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          cursor?: string;
          limit?: number;
          ownerId: string;
          status?: "live" | "released" | "failed";
        },
        any,
        Name
      >;
    };
    topLevel: {
      pdf: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          commandArgs?: Record<string, any>;
          delay?: number;
          ownerId?: string;
          timeout?: number;
          url: string;
        },
        any,
        Name
      >;
      scrape: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          commandArgs?: Record<string, any>;
          delay?: number;
          ownerId?: string;
          timeout?: number;
          url: string;
        },
        any,
        Name
      >;
      screenshot: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          commandArgs?: Record<string, any>;
          delay?: number;
          ownerId?: string;
          timeout?: number;
          url: string;
        },
        any,
        Name
      >;
    };
  };
