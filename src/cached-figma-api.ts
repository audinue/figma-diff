import type { CacheStorage } from "./cache-storage";
import type {
  FigmaAPI,
  GetFileOptions,
  GetFileResponse,
  GetFileVersionsResponse,
} from "./figma-api";

const versionsCacheKey = "figma:file:versions";

export class CachedFigmaAPI implements FigmaAPI {
  constructor(
    private readonly cacheStorage: CacheStorage,
    private readonly figmaAPI: FigmaAPI,
  ) {}

  async getFile(options: GetFileOptions): Promise<GetFileResponse> {
    return this.getOrSet(
      fileCacheKey(options),
      () => this.figmaAPI.getFile(options),
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

function fileCacheKey(options: GetFileOptions): string {
  const fileCacheNamespace = `figma:file:depth${options.depth}`;
  return options.version === undefined
    ? `${fileCacheNamespace}:current`
    : `${fileCacheNamespace}:${options.version}`;
}
