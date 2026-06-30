import type {
  FigmaAPI,
  GetFileResponse,
  GetFileVersionsResponse,
} from "./figma-api";

export type FetchFigmaAPIOptions = {
  fileKey: string;
  accessToken: string;
};

export class FetchFigmaAPI implements FigmaAPI {
  private readonly fileKey: string;
  private readonly accessToken: string;

  constructor(options: FetchFigmaAPIOptions) {
    this.fileKey = options.fileKey;
    this.accessToken = options.accessToken;
  }

  async getFile(version?: string): Promise<GetFileResponse> {
    const url = new URL(`https://api.figma.com/v1/files/${this.fileKey}`);
    url.searchParams.set("depth", "3");

    if (version !== undefined) {
      url.searchParams.set("version", version);
    }

    return fetchFigma<GetFileResponse>(url, this.accessToken);
  }

  async getFileVersions(): Promise<GetFileVersionsResponse> {
    return fetchFigma<GetFileVersionsResponse>(
      new URL(`https://api.figma.com/v1/files/${this.fileKey}/versions`),
      this.accessToken,
    );
  }
}

async function fetchFigma<T>(url: URL, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": accessToken,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Figma API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}
