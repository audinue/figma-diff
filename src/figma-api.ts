import type {
  GetFileResponse,
  GetFileVersionsResponse,
} from "@figma/rest-api-spec";

export type { GetFileResponse, GetFileVersionsResponse };

export type GetFileOptions = {
  version?: string;
  depth: number;
};

export interface FigmaAPI {
  getFile(options: GetFileOptions): Promise<GetFileResponse>;
  getFileVersions(): Promise<GetFileVersionsResponse>;
}
