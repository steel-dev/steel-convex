# Steel Convex Component

Production-ready Convex component wrapper for Steel.

## Scope

Implemented modules:

- Sessions lifecycle + cache
  - `create`, `refresh`, `refreshMany`, `release`, `releaseAll`
  - `get`, `getByExternalId`, `list`
  - `computer`, `context`, `events`, `liveDetails`
- Session files
  - `list`, `upload`, `delete`, `deleteAll`
- Captchas
  - `status`, `solve`, `solveImage`
- Profiles
  - `list`, `get`, `create`, `update`
- Credentials
  - `create`, `update`, `list`, `delete`
- Extensions
  - `list`, `upload`, `update`, `delete`, `deleteAll`, `download`
- Global files
  - `list`, `upload`, `delete`, `download`
- Top-level utilities
  - `steel.screenshot`, `steel.scrape`, `steel.pdf`

All public actions require `ownerId`.

## Install

```bash
npm i steel-convex-component
```

Peer dependency: `convex@^1.32.0`  
Runtime dependency: `steel-sdk@^0.17.0`

## Quick Start

```ts
import { defineApp } from "convex/server";
import steel from "steel-convex-component/convex.config";

const app = defineApp();
app.use(steel);
export default app;
```

```ts
import { action } from "./_generated/server";
import { components } from "./_generated/server";
import { SteelComponent } from "steel-convex-component";

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

## Data Model

Component tables:

- `sessions`
- `sessionFileMetadata`
- `captchaStates`
- `profiles`
- `credentials`
- `extensions`
- `globalFiles`

All metadata tables are owner-scoped via `ownerId`.

## Development

```bash
npm run typecheck
npm run test
npm run build
```

Live integration smoke test is opt-in:

```bash
STEEL_API_KEY=... STEEL_LIVE_TEST=1 npm test
```

## API Docs

See [`API.md`](./API.md).
