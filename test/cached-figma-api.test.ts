import { describe, expect, test } from "bun:test";
import { CachedFigmaAPI } from "../src/infra/cached-figma-api";
import { InMemoryCacheStorage } from "../src/infra/in-memory-cache-storage";
import type {
  FigmaAPI,
  GetFileOptions,
  GetFileResponse,
  GetFileVersionsResponse,
} from "../src/core/figma-api";

function fileResponse(version: string, depth = 3): GetFileResponse {
  return {
    name: `File ${version} depth ${depth}`,
    role: "owner",
    lastModified: "2026-06-30T00:00:00Z",
    editorType: "figma",
    version,
    document: {
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      scrollBehavior: "SCROLLS",
      children: [],
    },
    components: {},
    componentSets: {},
    schemaVersion: 0,
    styles: {},
  } as GetFileResponse;
}

function versionsResponse(): GetFileVersionsResponse {
  return {
    versions: [],
    pagination: {},
  } as GetFileVersionsResponse;
}

class CountingFigmaAPI implements FigmaAPI {
  fileCalls = 0;
  versionsCalls = 0;
  fileOptions: GetFileOptions[] = [];

  async getFile(options: GetFileOptions): Promise<GetFileResponse> {
    this.fileCalls += 1;
    this.fileOptions.push(options);
    return fileResponse(options.version ?? "current", options.depth);
  }

  async getFileVersions(): Promise<GetFileVersionsResponse> {
    this.versionsCalls += 1;
    return versionsResponse();
  }
}

describe("InMemoryCacheStorage", () => {
  test("stores values by key", async () => {
    const storage = new InMemoryCacheStorage();

    await storage.set("name", "figma");

    expect(await storage.get("name")).toBe("figma");
    expect(await storage.get("missing")).toBeUndefined();
  });
});

describe("CachedFigmaAPI", () => {
  test("caches current file response", async () => {
    const figmaAPI = new CountingFigmaAPI();
    const cachedAPI = new CachedFigmaAPI(new InMemoryCacheStorage(), figmaAPI);

    await expect(cachedAPI.getFile({ depth: 3 })).resolves.toMatchObject({
      version: "current",
    });
    await expect(cachedAPI.getFile({ depth: 3 })).resolves.toMatchObject({
      version: "current",
    });

    expect(figmaAPI.fileCalls).toBe(1);
    expect(figmaAPI.fileOptions).toEqual([{ depth: 3 }]);
  });

  test("caches file versions response", async () => {
    const figmaAPI = new CountingFigmaAPI();
    const cachedAPI = new CachedFigmaAPI(new InMemoryCacheStorage(), figmaAPI);

    await cachedAPI.getFileVersions();
    await cachedAPI.getFileVersions();

    expect(figmaAPI.versionsCalls).toBe(1);
  });

  test("caches different file versions separately", async () => {
    const figmaAPI = new CountingFigmaAPI();
    const cachedAPI = new CachedFigmaAPI(new InMemoryCacheStorage(), figmaAPI);

    await expect(cachedAPI.getFile({ version: "1", depth: 3 })).resolves.toMatchObject({
      version: "1",
    });
    await expect(cachedAPI.getFile({ version: "2", depth: 3 })).resolves.toMatchObject({
      version: "2",
    });
    await expect(cachedAPI.getFile({ version: "1", depth: 3 })).resolves.toMatchObject({
      version: "1",
    });

    expect(figmaAPI.fileCalls).toBe(2);
  });

  test("caches different file depths separately", async () => {
    const figmaAPI = new CountingFigmaAPI();
    const cachedAPI = new CachedFigmaAPI(new InMemoryCacheStorage(), figmaAPI);

    await expect(cachedAPI.getFile({ version: "1", depth: 2 })).resolves.toMatchObject({
      name: "File 1 depth 2",
    });
    await expect(cachedAPI.getFile({ version: "1", depth: 3 })).resolves.toMatchObject({
      name: "File 1 depth 3",
    });
    await expect(cachedAPI.getFile({ version: "1", depth: 2 })).resolves.toMatchObject({
      name: "File 1 depth 2",
    });

    expect(figmaAPI.fileCalls).toBe(2);
    expect(figmaAPI.fileOptions).toEqual([
      { version: "1", depth: 2 },
      { version: "1", depth: 3 },
    ]);
  });
});
