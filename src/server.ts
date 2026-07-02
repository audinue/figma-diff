import { diffFigmaFiles } from "./figma-diff";
import type { FigmaAPI } from "./figma-api";
import { renderDiffResultView } from "./diff-result-view";
import { renderLayoutView } from "./layout-view";
import { renderVersionListView } from "./version-list-view";

export type FigmaDiffServerDependencies = {
  figmaAPI: FigmaAPI;
  fileKey: string;
  fileName?: string;
};

export type FigmaDiffServerOptions = {
  port?: number;
  hostname?: string;
};

export function createFigmaDiffHandler(
  dependencies: FigmaDiffServerDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const url = new URL(request.url);

    if (request.method !== "GET") {
      return htmlResponse(
        renderErrorPage("Method not allowed", "Only GET is supported."),
        405,
      );
    }

    if (url.pathname === "/" || url.pathname === "/versions") {
      const versions = await dependencies.figmaAPI.getFileVersions();
      return htmlResponse(
        renderLayoutView({
          title: "Figma Versions",
          body: renderVersionListView(versions),
        }),
      );
    }

    if (url.pathname === "/diff") {
      const selectedVersion = url.searchParams.get("version");
      const beforeVersion = url.searchParams.get("before");
      const afterVersion = url.searchParams.get("after");

      if (selectedVersion !== null) {
        const [selected, current] = await Promise.all([
          dependencies.figmaAPI.getFile(selectedVersion),
          dependencies.figmaAPI.getFile(),
        ]);
        const diff = diffFigmaFiles(selected, current);

        return htmlResponse(
          renderLayoutView({
            title: "Figma Diff",
            body: renderDiffResultView(diff, {
              fileKey: dependencies.fileKey,
              fileName: dependencies.fileName,
            }),
          }),
        );
      }

      if (beforeVersion === null || afterVersion === null) {
        return htmlResponse(
          renderErrorPage(
            "Missing versions",
            "Diff needs version, or before and after query params.",
          ),
          400,
        );
      }

      const [before, after] = await Promise.all([
        dependencies.figmaAPI.getFile(beforeVersion),
        dependencies.figmaAPI.getFile(afterVersion),
      ]);
      const diff = diffFigmaFiles(before, after);

      return htmlResponse(
        renderLayoutView({
          title: "Figma Diff",
          body: renderDiffResultView(diff, {
            fileKey: dependencies.fileKey,
            fileName: dependencies.fileName,
          }),
        }),
      );
    }

    return htmlResponse(
      renderErrorPage("Not found", `${url.pathname} does not exist.`),
      404,
    );
  };
}

export function createFigmaDiffServer(
  dependencies: FigmaDiffServerDependencies,
  options: FigmaDiffServerOptions = {},
): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    port: options.port ?? 3000,
    hostname: options.hostname,
    idleTimeout: 0,
    fetch: createFigmaDiffHandler(dependencies),
  });
}

function htmlResponse(markup: string, status = 200): Response {
  return new Response(markup, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

function renderErrorPage(title: string, message: string): string {
  return renderLayoutView({
    title,
    body: `
      <main>
        <header class="diff-result__header">
          <h1>${Bun.escapeHTML(title)}</h1>
          <p>${Bun.escapeHTML(message)}</p>
        </header>
      </main>
    `,
  });
}
