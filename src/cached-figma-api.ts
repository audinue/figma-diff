import type { CacheStorage } from "./cache-storage";
import type {
  FigmaAPI,
  GetFileResponse,
  GetFileVersionsResponse,
} from "./figma-api";

const fileCacheNamespace = "figma:file:depth3";
const currentFileCacheKey = `${fileCacheNamespace}:current`;
const versionsCacheKey = "figma:file:versions";

export class CachedFigmaAPI implements FigmaAPI {
  constructor(
    private readonly cacheStorage: CacheStorage,
    private readonly figmaAPI: FigmaAPI,
  ) {}

  async getFile(version?: string): Promise<GetFileResponse> {
    return this.getOrSet(
      version === undefined ? currentFileCacheKey : `${fileCacheNamespace}:${version}`,
      () => this.figmaAPI.getFile(version),
    );
  }

  async getFileVersions(): Promise<GetFileVersionsResponse> {
    return this.getOrSet(versionsCacheKey, () => this.figmaAPI.getFileVersions());
  }

  private async getOrSet<T>(key: string, fetchValue: () => Promise<T>): Promise<T> {
    const cached = await this.cacheStorage.get(key);
    if (cached !== undefined) {
      return JSON.parse(cached) as T;
    }

    const value = await fetchValue();
    await this.cacheStorage.set(key, JSON.stringify(value));
    return value;
  }
}
