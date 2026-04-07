# Steel Convex Component

Add Steel browser sessions to your Convex app. Create, manage, and release cloud browser sessions — scoped per tenant — directly from your Convex actions.

## Quick Start

Install the component:

```bash
npm install steel-convex-component convex
```

Mount it in your `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import steel from "steel-convex-component/convex.config";

const app = defineApp();
app.use(steel);
export default app;
```

Set your API key:

```bash
npx convex env set STEEL_API_KEY <your_steel_key>
```

Create your first session:

```ts
import { action } from "./_generated/server";
import { components } from "./_generated/api";
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

Every method takes an `ownerId` — sessions for `tenant-a` are invisible to `tenant-b`.

## What you can do

**Sessions** — Create, refresh, release, and query browser sessions. Bulk-refresh or release by status. Inspect live session details, events, and context.

**Scraping & screenshots** — Scrape a page or take a screenshot/PDF without managing sessions yourself. One call does the work.

**Captchas** — Check captcha status on a session, solve text captchas, or solve image captchas.

**Profiles & credentials** — Save and reuse browser profiles and login credentials across sessions.

**Extensions** — Upload, update, and manage browser extensions that load into your sessions.

**Files** — Attach files to individual sessions or manage global files shared across your app.

## Guides & Reference

- [Getting Started Guide](./GUIDE.md) — step-by-step walkthrough with a real-world example
- [API Reference](./API.md) — full method signatures for every module

## Development

```bash
npm run typecheck
npm run test
npm run build
```

Live integration smoke test (opt-in):

```bash
STEEL_API_KEY=... STEEL_LIVE_TEST=1 npm test
```

## License

MIT
