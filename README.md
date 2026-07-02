# figma-diff

Small Bun app buat compare current Figma file dengan version tertentu.

## Setup

```bash
bun install
cp .env.example .env
```

Isi `.env`:

```bash
FIGMA_ACCESS_TOKEN=figd_your_token_here
FIGMA_FILE_KEY=AbCdEfGhIjKlMnOpQrStUv
FIGMA_FILE_NAME=Example-Figma-File
PORT=3000
```

## Run

```bash
bun run server
```

Buka:

```text
http://localhost:3000
```

Default server pakai Figma API live + SQLite cache di `figma-cache.sqlite`.

## Test

```bash
bun test
```

Typecheck:

```bash
bunx tsc --noEmit
```

## Screenshot Views

```bash
bun run view-test
```

Output disimpan ke `screenshots/`.

## Behavior

- Version list membuka `/diff?version=<version-id>`.
- Diff membandingkan selected version sebagai `before` dengan current Figma file sebagai `after`.
- Diff routes fetch file pakai `depth=3`.
- Cache key file response pakai `depth` dari request options.
- Link Figma untuk `before` pakai `version-id`.
- Link Figma untuk `after` / current tidak pakai `version-id`.

## Architecture

```mermaid
flowchart TD
  request([HTTP request])

  subgraph infra["Infrastructure / composition root"]
    main["src/server-main.ts"]
    cached["src/cached-figma-api.ts"]
    fetch["src/fetch-figma-api.ts"]
    sqlite["src/sqlite-cache-storage.ts"]
  end

  subgraph testInfra["Test adapters"]
    memoryApi["src/in-memory-figma-api.ts"]
    memoryCache["src/in-memory-cache-storage.ts"]
  end

  subgraph app["HTTP application"]
    server["src/server.ts"]
  end

  subgraph core["Core diff"]
    diff["src/figma-diff.ts"]
  end

  subgraph views["HTML views"]
    versionList["src/version-list-view.ts"]
    diffResult["src/diff-result-view.ts"]
    layout["src/layout-view.ts"]
    html["src/html.ts"]
  end

  subgraph contracts["Contracts"]
    figmaApi["src/figma-api.ts"]
    cacheStorage["src/cache-storage.ts"]
  end

  request --> server
  main --> server
  main --> cached
  main --> fetch
  main --> sqlite
  server --> figmaApi
  server --> diff
  server --> versionList
  server --> diffResult
  server --> layout

  cached --> cacheStorage
  cached --> figmaApi
  fetch --> figmaApi
  memoryApi --> figmaApi
  sqlite --> cacheStorage
  memoryCache --> cacheStorage

  diff --> figmaApi
  versionList --> figmaApi
  diffResult --> figmaApi
  versionList --> html
  diffResult --> html
  layout --> html

  classDef entry fill:#f8b84e,stroke:#8a5a00,color:#1f1600;
  classDef orchestrator fill:#fff7df,stroke:#b78a1d,color:#1f1600;
  classDef adapter fill:#e8f3ff,stroke:#3977aa,color:#10263a;
  classDef core fill:#e9f8e6,stroke:#4d9446,color:#143011;
  classDef view fill:#f3edff,stroke:#7d5ab8,color:#24143f;
  classDef contract fill:#f5f5f5,stroke:#777,color:#222;

  class request,main entry;
  class server orchestrator;
  class cached,fetch,memoryApi,sqlite,memoryCache adapter;
  class diff core;
  class versionList,diffResult,layout,html view;
  class figmaApi,cacheStorage contract;
```
