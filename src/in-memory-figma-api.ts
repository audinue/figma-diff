import type {
  FigmaAPI,
  GetFileOptions,
  GetFileResponse,
  GetFileVersionsResponse,
} from "./figma-api";
import {
  sampleCurrentFile,
  sampleOlderFile,
  sampleVersions,
} from "./sample-figma-data";

export type InMemoryFigmaAPIOptions = {
  currentFile?: GetFileResponse;
  versions?: GetFileVersionsResponse;
  filesByVersion?: ReadonlyMap<string, GetFileResponse> | Record<string, GetFileResponse>;
};

export class InMemoryFigmaAPI implements FigmaAPI {
  private readonly currentFile: Promise<GetFileResponse>;
  private readonly versions: Promise<GetFileVersionsResponse>;
  private readonly filesByVersion: Promise<ReadonlyMap<string, GetFileResponse>>;

  constructor(options: InMemoryFigmaAPIOptions = {}) {
    this.currentFile =
      options.currentFile === undefined
        ? Promise.resolve(sampleCurrentFile)
        : Promise.resolve(options.currentFile);
    this.versions =
      options.versions === undefined
        ? Promise.resolve(sampleVersions)
        : Promise.resolve(options.versions);
    this.filesByVersion = buildFilesByVersion(options.filesByVersion);
  }

  async getFile(options: GetFileOptions): Promise<GetFileResponse> {
    if (options.version === undefined) {
      return this.currentFile;
    }

    const file = (await this.filesByVersion).get(options.version);
    if (file === undefined) {
      throw new Error(`Figma file version not found: ${options.version}`);
    }

    return file;
  }

  async getFileVersions(): Promise<GetFileVersionsResponse> {
    return this.versions;
  }
}

async function buildFilesByVersion(
  filesByVersion: InMemoryFigmaAPIOptions["filesByVersion"],
): Promise<ReadonlyMap<string, GetFileResponse>> {
  if (filesByVersion instanceof Map) {
    return filesByVersion;
  }

  if (filesByVersion !== undefined) {
    return new Map(Object.entries(filesByVersion));
  }

  const files = [sampleOlderFile, sampleCurrentFile];

  return new Map(files.map((file) => [file.version, file]));
}
