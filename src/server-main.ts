import { CachedFigmaAPI } from "./cached-figma-api";
import { FetchFigmaAPI } from "./fetch-figma-api";
import { createFigmaDiffServer, type FigmaDiffServerOptions } from "./server";
import { SqliteCacheStorage } from "./sqlite-cache-storage";

export function createFigmaDiffServerFromEnv(
  options: FigmaDiffServerOptions = {},
): ReturnType<typeof Bun.serve> {
  const accessToken = process.env.FIGMA_ACCESS_TOKEN;
  const fileKey = process.env.FIGMA_FILE_KEY;
  const fileName = process.env.FIGMA_FILE_NAME;

  if (!accessToken || !fileKey) {
    throw new Error("FIGMA_ACCESS_TOKEN and FIGMA_FILE_KEY must be set");
  }

  return createFigmaDiffServer(
    {
      fileKey,
      fileName,
      figmaAPI: new CachedFigmaAPI(
        new SqliteCacheStorage(),
        new FetchFigmaAPI({
          accessToken,
          fileKey,
        }),
      ),
    },
    options,
  );
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? "3000");
  const server = createFigmaDiffServerFromEnv({ port });

  console.log(`Figma diff server running at ${server.url}`);
}
