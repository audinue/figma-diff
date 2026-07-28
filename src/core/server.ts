import { buildChangesSince } from "./changes-since";
import { renderChangesSinceView } from "./changes-since-view";
import { diffFigmaFiles } from "./figma-diff";
import type { FigmaAPI } from "./figma-api";
import {
  buildAgentChangesSinceJson,
  buildAgentDiffJson,
  buildAgentVersionsJson,
} from "./agent-json";
import { renderDiffResultView } from "./diff-result-view";
import { renderLayoutView } from "./layout-view";
import { renderVersionListView } from "./version-list-view";

const figmaFileDepth = 3;

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

    if (request.method === "POST" && url.pathname === "/clear-versions") {
      await dependencies.figmaAPI.clearFileVersionsCache?.();
      return redirectResponse("/");
    }

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

    if (url.pathname === "/versions.json") {
      const versions = await dependencies.figmaAPI.getFileVersions();
      return jsonResponse(buildAgentVersionsJson(versions));
    }

    if (url.pathname === "/diff" || url.pathname === "/diff.json") {
      const selectedVersion = url.searchParams.get("version");
      const beforeVersion = url.searchParams.get("before");
      const afterVersion = url.searchParams.get("after");
      const wantsJson = url.pathname === "/diff.json";

      if (selectedVersion !== null) {
        const [selected, current] = await Promise.all([
          dependencies.figmaAPI.getFile({
            version: selectedVersion,
            depth: figmaFileDepth,
          }),
          dependencies.figmaAPI.getFile({ depth: figmaFileDepth }),
        ]);
        const diff = diffFigmaFiles(selected, current);

        if (wantsJson) {
          return jsonResponse(buildAgentDiffJson(diff, {
            fileKey: dependencies.fileKey,
            fileName: dependencies.fileName,
          }));
        }

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
        if (wantsJson) {
          return jsonResponse(
            {
              kind: "error",
              title: "Missing versions",
              message: "Diff needs version, or before and after query params.",
            },
            400,
          );
        }

        return htmlResponse(
          renderErrorPage(
            "Missing versions",
            "Diff needs version, or before and after query params.",
          ),
          400,
        );
      }

      const [before, after] = await Promise.all([
        dependencies.figmaAPI.getFile({
          version: beforeVersion,
          depth: figmaFileDepth,
        }),
        dependencies.figmaAPI.getFile({
          version: afterVersion,
          depth: figmaFileDepth,
        }),
      ]);
      const diff = diffFigmaFiles(before, after);

      if (wantsJson) {
        return jsonResponse(buildAgentDiffJson(diff, {
          fileKey: dependencies.fileKey,
          fileName: dependencies.fileName,
        }));
      }

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

    if (url.pathname === "/changes-since" || url.pathname === "/changes-since.json") {
      const selectedVersion = url.searchParams.get("version");
      const wantsJson = url.pathname === "/changes-since.json";

      if (selectedVersion === null) {
        if (wantsJson) {
          return jsonResponse(
            {
              kind: "error",
              title: "Missing version",
              message: "Changes since needs a version query param.",
            },
            400,
          );
        }

        return htmlResponse(
          renderErrorPage(
            "Missing version",
            "Changes since needs a version query param.",
          ),
          400,
        );
      }

      try {
        const changes = await buildChangesSince(dependencies.figmaAPI, {
          version: selectedVersion,
          depth: figmaFileDepth,
        });

        if (wantsJson) {
          return jsonResponse(buildAgentChangesSinceJson(changes, {
            fileKey: dependencies.fileKey,
            fileName: dependencies.fileName,
          }));
        }

        return htmlResponse(
          renderLayoutView({
            title: "Figma Changes Since",
            body: renderChangesSinceView(changes, {
              fileKey: dependencies.fileKey,
              fileName: dependencies.fileName,
            }),
          }),
        );
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Figma version not found:")) {
          if (wantsJson) {
            return jsonResponse(
              {
                kind: "error",
                title: "Version not found",
                message: error.message,
              },
              404,
            );
          }

          return htmlResponse(
            renderErrorPage("Version not found", error.message),
            404,
          );
        }

        throw error;
      }
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

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
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

function redirectResponse(location: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      location,
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
