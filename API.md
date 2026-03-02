# API Reference

## Wrapper

Use `SteelComponent` from [src/client/index.ts](/home/agent/steel-convex-component/src/client/index.ts).

Constructor:

```ts
new SteelComponent(components.steel, {
  STEEL_API_KEY?: string,
  ownerId?: string,
})
```

Rules:

- All wrapper methods require `ownerId` (method args, call options override, or constructor default).
- All action methods require `apiKey` (resolved from method args, call options override, constructor, or `process.env.STEEL_API_KEY`).

## Sessions

Actions:

- `sessions.create(ctx, { sessionArgs?, includeRaw?, ownerId? }, options?)`
- `sessions.refresh(ctx, { externalId, includeRaw?, ownerId? }, options?)`
- `sessions.refreshMany(ctx, { status?, cursor?, limit?, includeRaw?, ownerId? }, options?)`
- `sessions.release(ctx, { externalId, ownerId? }, options?)`
- `sessions.releaseAll(ctx, { status?, cursor?, limit?, ownerId? }, options?)`
- `sessions.computer(ctx, { externalId, commandArgs, ownerId? }, options?)`
- `sessions.context(ctx, { externalId, ownerId? }, options?)`
- `sessions.events(ctx, { externalId, ownerId? }, options?)`
- `sessions.liveDetails(ctx, { externalId, ownerId? }, options?)`

Queries:

- `sessions.get(ctx, { id, ownerId? }, options?)`
- `sessions.getByExternalId(ctx, { externalId, ownerId? }, options?)`
- `sessions.list(ctx, { status?, cursor?, limit?, ownerId? }, options?)`

## Session Files

Actions:

- `sessionFiles.list(ctx, { sessionExternalId, ownerId? }, options?)`
- `sessionFiles.upload(ctx, { sessionExternalId, file?, url?, path?, fileArgs?, ownerId? }, options?)`
- `sessionFiles.uploadFromUrl(...)` (alias of `upload`)
- `sessionFiles.delete(ctx, { sessionExternalId, path, ownerId? }, options?)`
- `sessionFiles.deleteAll(ctx, { sessionExternalId, ownerId? }, options?)`

## Captchas

Actions:

- `captchas.status(ctx, { sessionExternalId, pageId?, persistSnapshot?, ownerId? }, options?)`
- `captchas.solve(ctx, { sessionExternalId, pageId?, url?, taskId?, commandArgs?, ownerId? }, options?)`
- `captchas.solveImage(ctx, { sessionExternalId, imageXPath, inputXPath, url?, commandArgs?, ownerId? }, options?)`

## Profiles

Actions:

- `profiles.list(ctx, { ownerId? }, options?)`
- `profiles.get(ctx, { externalId, ownerId? }, options?)`
- `profiles.create(ctx, { profileArgs?, userDataDirUrl?, ownerId? }, options?)`
- `profiles.update(ctx, { externalId, profileArgs?, userDataDirUrl?, ownerId? }, options?)`
- `profiles.createFromUrl(...)` (alias of `create`)
- `profiles.updateFromUrl(...)` (alias of `update`)

## Credentials

Actions:

- `credentials.create(ctx, { credentialArgs?, ownerId? }, options?)`
- `credentials.update(ctx, { credentialArgs?, ownerId? }, options?)`
- `credentials.list(ctx, { queryArgs?, ownerId? }, options?)`
- `credentials.delete(ctx, { origin?, namespace?, externalId?, ownerId? }, options?)`

## Extensions

Actions:

- `extensions.list(ctx, { ownerId? }, options?)`
- `extensions.upload(ctx, { extensionArgs?, url?, file?, ownerId? }, options?)`
- `extensions.update(ctx, { externalId, extensionArgs?, url?, file?, ownerId? }, options?)`
- `extensions.uploadFromUrl(...)` (alias of `upload`)
- `extensions.updateFromUrl(...)` (alias of `update`)
- `extensions.delete(ctx, { externalId, ownerId? }, options?)`
- `extensions.deleteAll(ctx, { ownerId? }, options?)`
- `extensions.download(ctx, { externalId, ownerId? }, options?)`

## Global Files

Actions:

- `files.list(ctx, { ownerId? }, options?)`
- `files.upload(ctx, { file?, url?, path?, fileArgs?, ownerId? }, options?)`
- `files.uploadFromUrl(...)` (alias of `upload`)
- `files.delete(ctx, { path?, externalId?, ownerId? }, options?)`
- `files.download(ctx, { path?, externalId?, ownerId? }, options?)`
- `files.downloadToStorage(...)` (alias of `download`)

## Top-Level Utilities

Actions:

- `steel.screenshot(ctx, { url, delay?, timeout?, commandArgs?, ownerId? }, options?)`
- `steel.scrape(ctx, { url, delay?, timeout?, commandArgs?, ownerId? }, options?)`
- `steel.pdf(ctx, { url, delay?, timeout?, commandArgs?, ownerId? }, options?)`

`timeout` is accepted for compatibility and normalized to Steel `delay`.

## Component Internals

Main internals in [sessions.ts](/home/agent/steel-convex-component/src/component/sessions.ts):

- `upsert`
- `getInternalByExternalId`
- `listInternalByOwner`

These are used for local cache reconciliation and release batching.
