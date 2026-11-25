# Repository Notes

Balas user dalam bahasa Indonesia yang santai, akrab, dan langsung ke inti.

## Project

Repo ini adalah Bun/TypeScript app untuk diff Figma file versions.

Core flow:

```text
src/index.ts
  -> wires concrete infra:
     CachedFigmaAPI + SqliteCacheStorage + FetchFigmaAPI
  -> injects FigmaAPI into server

HTTP request
  -> src/core/server.ts
  -> injected FigmaAPI
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

## Agent Usage

Saat user nanya semacam "figma ada perubahan apa aja?", pakai endpoint JSON dulu, bukan scrape HTML.

Recommended flow:

1. Start server lokal:

```bash
PORT=3434 bun src/index.ts
```

2. Ambil daftar version:

```bash
curl -sS "http://localhost:3434/versions.json"
```

3. Pilih version yang relevan, lalu ambil diff ringkas:

```bash
curl -sS "http://localhost:3434/diff.json?version=<version-id>"
```

4. Kalau user minta perubahan bertahap sejak version tertentu:

```bash
curl -sS "http://localhost:3434/changes-since.json?version=<version-id>"
```

JSON endpoints:

- `/versions.json`: daftar version, createdAt, user, dan URL JSON lanjutan.
- `/diff.json?version=<version-id>`: selected version sebagai `before`, current file sebagai `after`.
- `/diff.json?before=<version-id>&after=<version-id>`: compare dua historical versions.
- `/changes-since.json?version=<version-id>`: chain perubahan dari selected version sampai current.

Agent response guidance:

- Mulai dari `summary.counts` atau `summary.totals`, lalu sebut page/node/frame yang berubah.
- Pakai `changedPages[].frames[].changes[].summary` atau `topLevelNodes[].steps[].page.frames[].changes[].summary` untuk penjelasan field-level.
- Sertakan `figmaUrl`, `beforeFigmaUrl`, atau `afterFigmaUrl` kalau user butuh link inspect.
- Kalau JSON punya `warnings`, sebutkan apa adanya. Warning stale cache berarti hasil belum boleh diklaim sebagai latest tanpa refresh cache/API.
- Untuk hemat Figma API, pakai version yang sudah ada di cache kalau cuma eksplorasi. Jangan POST `/clear-versions` kecuali user memang minta refresh daftar version.
- HTML routes (`/versions`, `/diff`, `/changes-since`) tetap buat manusia.

## Last Check Log

Tiap selesai ngecek "figma ada yang baru?", catat hasilnya di `last-check.json` (root repo, di-gitignore karena isinya metadata file Figma private).

- Sebelum ngecek, baca `last-check.json` kalau ada. Sebut ke user kapan terakhir dicek dan version apa yang waktu itu jadi latest.
- Kalau latest version sekarang beda dari `latestVersionId` terakhir, compare `before=<latestVersionId terakhir>&after=<latest sekarang>` biar semua perubahan sejak terakhir dicek kebaca, bukan cuma dua version terbaru. Kalau sama, cukup compare dua version terbaru kayak biasa dan bilang belum ada version baru sejak terakhir dicek.
- Setelah ngecek, append satu entry ke array `checks` (jangan timpa entry lama):

```json
{
  "checks": [
    {
      "checkedAt": "2026-11-24T13:30:00Z",
      "fileName": "<nama file Figma>",
      "latestVersionId": "<id>",
      "latestVersionCreatedAt": "<createdAt>",
      "latestVersionUser": "<user>",
      "comparedBefore": "<id>",
      "comparedAfter": "<id>",
      "counts": { "pagesChanged": 0, "framesAdded": 0, "framesRemoved": 0, "framesChanged": 0 },
      "warnings": [],
      "note": "<ringkasan satu kalimat>"
    }
  ]
}
```

- `checkedAt` pakai waktu UTC beneran dari `date -u +%Y-%m-%dT%H:%M:%SZ`, jangan ngarang.

## Invariants

- Runtime is Bun.
- Tests live in `test/`.
- `FigmaAPI` exposes only:
  - `getFile({ version?, depth })`
  - `getFileVersions()`
- `/diff` routes request Figma files with `depth=3`.
- `/diff.json` and `/changes-since.json` routes request Figma files with `depth=3`.
- `FetchFigmaAPI.getFile()` must pass through the requested `depth`.
- `/diff?version=<version-id>` compares selected version as `before` vs current file as `after`.
- `/diff.json?version=<version-id>` has the same comparison direction as `/diff?version=<version-id>`.
- Figma links for historical/selected `before` nodes include `version-id`.
- Figma links for current `after` nodes must not include `version-id`.
- Default live server cache is SQLite via `SqliteCacheStorage`.
- Cache keys for file responses must be derived from `GetFileOptions`, including `depth`.
- `src/index.ts` is the app entrypoint and composition root; it should start the server, not act as a library barrel.
- `src/infra/` contains concrete adapters.
- `src/core/` contains the FigmaAPI contract, HTTP app orchestration, diff, and view renderers.
- `src/index.ts` owns env parsing plus concrete adapter wiring.
- `src/core/server.ts` must stay dependency-injected and must not import concrete infra adapters like `FetchFigmaAPI`, `CachedFigmaAPI`, or `SqliteCacheStorage`.
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
index -> core/server + concrete adapters
core/server -> FigmaAPI + diff + views
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
