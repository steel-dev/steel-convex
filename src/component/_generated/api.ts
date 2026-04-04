/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as captchas from "../captchas.js";
import type * as credentials from "../credentials.js";
import type * as extensions from "../extensions.js";
import type * as files from "../files.js";
import type * as index from "../index.js";
import type * as normalize from "../normalize.js";
import type * as profiles from "../profiles.js";
import type * as sessionFiles from "../sessionFiles.js";
import type * as sessions from "../sessions.js";
import type * as steel from "../steel.js";
import type * as topLevel from "../topLevel.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  captchas: typeof captchas;
  credentials: typeof credentials;
  extensions: typeof extensions;
  files: typeof files;
  index: typeof index;
  normalize: typeof normalize;
  profiles: typeof profiles;
  sessionFiles: typeof sessionFiles;
  sessions: typeof sessions;
  steel: typeof steel;
  topLevel: typeof topLevel;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
