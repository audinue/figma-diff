import { describe, expect, test } from "bun:test";
import {
  CachedFigmaAPI,
  InMemoryCacheStorage,
  type FigmaAPI,
  type GetFileResponse,
  type GetFileVersionsResponse,
} from "../src/index";

function fileResponse(version: string): GetFileResponse {
  return {
    name: `File ${version}`,
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

  async getFile(version?: string): Promise<GetFileResponse> {
    this.fileCalls += 1;
    return fileResponse(version ?? "current");
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

    await expect(cachedAPI.getFile()).resolves.toMatchObject({ version: "current" });
    await expect(cachedAPI.getFile()).resolves.toMatchObject({ version: "current" });

    expect(figmaAPI.fileCalls).toBe(1);
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

    await expect(cachedAPI.getFile("1")).resolves.toMatchObject({ version: "1" });
    await expect(cachedAPI.getFile("2")).resolves.toMatchObject({ version: "2" });
    await expect(cachedAPI.getFile("1")).resolves.toMatchObject({ version: "1" });

    expect(figmaAPI.fileCalls).toBe(2);
  });
});
