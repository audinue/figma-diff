import type {
  GetFileResponse,
  GetFileVersionsResponse,
} from "@figma/rest-api-spec";

export type { GetFileResponse, GetFileVersionsResponse };

export interface FigmaAPI {
  getFile(version?: string): Promise<GetFileResponse>;
  getFileVersions(): Promise<GetFileVersionsResponse>;
}
