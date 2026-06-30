# Repository Notes

Balas user dalam bahasa Indonesia yang santai, akrab, dan langsung ke inti.

## Project

Repo ini adalah Bun/TypeScript app untuk diff Figma file versions.

Core flow:

```text
HTTP request
  -> server
  -> FigmaAPI
     -> CachedFigmaAPI
        -> CacheStorage
        -> FetchFigmaAPI / InMemoryFigmaAPI
  -> diffFigmaFiles
  -> view renderer
  -> layout HTML
```

## Commands

Install:

```bash
bun install
```

Run server:

```bash
bun run server
```

Verify:

```bash
./node_modules/.bin/tsc --noEmit
bun test
```

Generate view screenshots:

```bash
bun run view-test
```

## Invariants

- Runtime is Bun.
- Tests live in `test/`.
- `FigmaAPI` exposes only:
  - `getFile(version?)`
  - `getFileVersions()`
- `FetchFigmaAPI.getFile()` fetches with `depth=3`.
- `/diff?version=<version-id>` compares selected version as `before` vs current file as `after`.
- Figma links for historical/selected `before` nodes include `version-id`.
- Figma links for current `after` nodes must not include `version-id`.
- Default live server cache is SQLite via `SqliteCacheStorage`.
- Cache keys for file responses must stay depth-aware when fetch depth changes.
- `diffFigmaFiles(before, after)` is a pure function and should not know about HTTP, cache, env, or HTML.
- Views are plain tagged-template renderers and should not fetch data.
- Server should stay dependency-injected so tests can use `InMemoryFigmaAPI`.

## Privacy

Never commit real Figma credentials or private file metadata.

Do not commit:

- `.env`
- real `FIGMA_ACCESS_TOKEN`
- real `FIGMA_FILE_KEY`
- real `FIGMA_FILE_NAME`
- `figma-cache.sqlite`
- generated `screenshots/`
- `node_modules/`

Before committing, scan for known private values if they were used locally:

```bash
rg "real-file-key|real-file-name|figd_" . --glob '!node_modules/**' --glob '!.env'
git grep -n "real-file-key\|real-file-name\|figd_" HEAD
```

Use random placeholder values in `.env.example`, README, tests, and scripts.

## Architecture Notes

Keep dependency direction simple:

```text
server-main -> server + concrete adapters
server -> FigmaAPI + diff + views
views -> diff types
diff -> GetFileResponse type
fetch/cache/sqlite/in-memory -> interfaces
```

Avoid these couplings:

- diff importing server or views
- views fetching Figma data
- cache knowing HTTP routes
- `FetchFigmaAPI` knowing SQLite
- server knowing traversal internals of the diff engine

## Current Tradeoffs

- `sample-figma-data.ts` exists in `src` so `InMemoryFigmaAPI()` and screenshot tooling can run without the deleted `contoh/` folder.
- Diff currently reports changed flattened depth-3 nodes through frame-oriented names like `FigmaDiffFrame` and `framesChanged`. If this grows, consider renaming this surface to `nodes`.
