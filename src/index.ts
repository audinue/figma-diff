import { createFigmaDiffServer, type FigmaDiffServerOptions } from "./core/server";
import { CachedFigmaAPI } from "./infra/cached-figma-api";
import { FetchFigmaAPI } from "./infra/fetch-figma-api";
import { SqliteCacheStorage } from "./infra/sqlite-cache-storage";

function createFigmaDiffServerFromEnv(
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

const port = Number(process.env.PORT ?? "3000");
const server = createFigmaDiffServerFromEnv({ port });

console.log(`Figma diff server running at ${server.url}`);
