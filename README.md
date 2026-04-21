# Steel Convex Component

[![npm version](https://img.shields.io/npm/v/%40steel-dev%2Fconvex.svg)](https://www.npmjs.com/package/@steel-dev/convex)
[![Convex Component](https://www.convex.dev/components/badge/steel-dev)](https://www.convex.dev/components/steel-dev)

A [Convex](https://convex.dev) component for [Steel](https://steel.dev) cloud browser sessions. Manage browser sessions, scrape pages, solve captchas, and handle files — all from your Convex actions, with built-in multi-tenant isolation.

Features:

- **Multi-tenant sessions** — Every operation is scoped by `ownerId`. Tenant A never sees Tenant B's sessions.
- **Full session lifecycle** — Create, refresh, release, bulk-refresh, and bulk-release browser sessions.
- **Scraping & screenshots** — Scrape a page, take a screenshot, or generate a PDF in a single call.
- **Captcha solving** — Check captcha status, solve text captchas, or solve image captchas on any session.
- **Profiles & credentials** — Persist browser profiles and saved logins across sessions.
- **Extensions & files** — Upload browser extensions, attach files to sessions, or manage global files.
- **Convex-native state** — Session state is persisted in your Convex database, queryable in real time from your frontend.

## Quick Start

### 1. Install

```bash
npm install @steel-dev/convex convex
```

### 2. Mount the component

In your `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import steel from "@steel-dev/convex/convex.config";

const app = defineApp();
app.use(steel);
export default app;
```

### 3. Set your API key

```bash
npx convex env set STEEL_API_KEY <your_steel_key>
```

### 4. Create your first session

In a Convex action file, e.g. `convex/steelActions.ts`:

```ts
import { action } from "./_generated/server";
import { components } from "./_generated/api";
import { SteelComponent } from "@steel-dev/convex";

const steel = new SteelComponent(components.steel, {
  STEEL_API_KEY: process.env.STEEL_API_KEY,
});

export const createSession = action({
  args: {},
  handler: async (ctx) =>
    steel.sessions.create(
      ctx,
      { sessionArgs: { timeout: 120000 } },
      { ownerId: "tenant-a" },
    ),
});
```

### 5. Run it

```bash
npx convex dev
npx convex run steelActions:createSession
```

## Modules

| Module | What it does |
|---|---|
| `sessions` | Create, refresh, release, list, and inspect browser sessions |
| `steel` | One-shot scrape, screenshot, or PDF — no session management needed |
| `captchas` | Check status, solve text captchas, solve image captchas |
| `profiles` | Create, update, list, and retrieve browser profiles |
| `credentials` | Store and manage saved login credentials |
| `extensions` | Upload, update, delete, and download browser extensions |
| `files` | Upload, download, and delete global files |
| `sessionFiles` | Attach, list, and delete files on individual sessions |

## How it works

Steel handles the cloud browser. Convex handles the state. This component bridges both:

1. Your Convex action calls the Steel API to create or manage a browser session.
2. The component persists session state in your Convex database.
3. Your frontend can query session data in real time — no polling, no webhooks.

All operations are scoped by `ownerId`, so multi-tenant isolation is built in at the data layer.

## Constructor options

```ts
const steel = new SteelComponent(components.steel, {
  STEEL_API_KEY: process.env.STEEL_API_KEY,  // API key (or set via env var)
  ownerId: "default-tenant",                  // Default ownerId for all calls
});
```

- `STEEL_API_KEY` — Your Steel API key. If omitted, falls back to `process.env.STEEL_API_KEY`.
- `ownerId` — Default owner for all method calls. Can be overridden per call via the options argument.

## Troubleshooting

**`Missing STEEL_API_KEY`** — The Convex runtime does not inherit your shell environment. Set it explicitly:

```bash
npx convex env set STEEL_API_KEY <your_key>
```

**`Schema file missing default export`** — Make sure `convex/schema.ts` uses `export default defineSchema({...})`, not a named export.

**`No matching export ... components`** — Import `components` from `./_generated/api`, not `./_generated/server`.

**`paginate() is only supported in the app`** — This is a known Convex limitation. The component uses `take()` internally instead of `paginate()`.

## Guides & Reference

- [Getting Started Guide](./GUIDE.md) — step-by-step walkthrough with a real-world price monitor example
- [API Reference](./API.md) — full method signatures for every module
- [Demo project](https://github.com/steel-experiments/steel-convex-demo) — working example app

## Development

```bash
npm run codegen:verify
npm run typecheck
npm run test
npm run build
```

`npm run codegen:verify` and `npm test` start a local anonymous Convex backend automatically, so they do not require a cloud `CONVEX_DEPLOYMENT` or deploy key in CI.

Live integration smoke test (requires a Steel API key):

```bash
STEEL_API_KEY=... STEEL_LIVE_TEST=1 npm test
```

## License

MIT
