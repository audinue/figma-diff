import { afterEach, describe, expect, test } from "bun:test";
import type { GetFileResponse, GetFileVersionsResponse } from "../src/core/figma-api";
import {
  sampleCurrentFile,
  sampleOlderFile,
  sampleVersions,
} from "../src/core/sample-figma-data";
import { createFigmaDiffServer } from "../src/core/server";
import { InMemoryFigmaAPI, type InMemoryFigmaAPIOptions } from "../src/infra/in-memory-figma-api";

const servers: ReturnType<typeof createFigmaDiffServer>[] = [];

afterEach(() => {
  for (const server of servers.splice(0)) {
    server.stop(true);
  }
});

describe("Figma diff server", () => {
  test("renders version list with injected in-memory API", async () => {
    const server = createTestServer();

    const response = await fetch(new URL("/versions", server.url));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(html).toContain("<main class=\"version-list\">");
    expect(html).toContain("/diff?version=2369347764861345445");
    expect(html).toContain("/changes-since?version=2369347764861345445");
  });

  test("renders diff page between current file and selected version", async () => {
    const server = createTestServer();

    const response = await fetch(
      new URL(
        "/diff?version=2366075322438973666",
        server.url,
      ),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("<main class=\"diff-result\">");
    expect(html).toContain("Frames changed");
    expect(html).toContain("Screenshot 2026-05-18 at 16.31.14 1");
    expect(html).toContain("2366075322438973666 -> 2369347764861345445");
  });

  test("returns 400 when diff params are missing", async () => {
    const server = createTestServer();

    const response = await fetch(new URL("/diff", server.url));
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(html).toContain("Missing versions");
  });

  test("renders chained changes since selected version", async () => {
    const middleFile = cloneFile(sampleCurrentFile);
    middleFile.version = "2367000000000000000";
    middleFile.lastModified = "2026-06-20T10:00:00Z";
    setFrameX(middleFile, "4780:383317", -412);

    const versions = {
      ...sampleVersions,
      versions: [
        sampleVersions.versions[0],
        {
          id: middleFile.version,
          created_at: "2026-06-20T10:00:00Z",
          label: "Middle",
          description: null,
          user: {
            handle: "Eurlich Allan",
            img_url: "",
            id: "617230080296806206",
          },
          thumbnail_url: "",
        },
        sampleVersions.versions[1],
      ],
    } as GetFileVersionsResponse;
    const server = createTestServer({
      currentFile: sampleCurrentFile,
      versions,
      filesByVersion: {
        [sampleOlderFile.version]: sampleOlderFile,
        [middleFile.version]: middleFile,
      },
    });

    const response = await fetch(
      new URL(
        "/changes-since?version=2366075322438973666",
        server.url,
      ),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("<main class=\"changes-since\">");
    expect(html).toContain("Version steps");
    expect(html).toContain("<strong>2</strong>");
    expect(html).toContain("<details class=\"changes-node\" open>");
    expect(html).toContain("<details class=\"changes-step\" open>");
    expect(html).toContain("Office Agent Portal - Registration | Onboarding | Contact");
    expect(html).toContain("Receiving");
    expect(html).toContain("Middle");
    expect(html).toContain("2369347764861345445");
    expect(html).toContain("Open current frame");
    expect(html).toContain(
      "https://www.figma.com/design/AbCdEfGhIjKlMnOpQrStUv/Example-Figma-File?node-id=4780-383317",
    );
    expect(html).not.toContain(
      "version-id=2369347764861345445&amp;node-id=4780-383317",
    );
  });

  test("returns 400 when changes-since version is missing", async () => {
    const server = createTestServer();

    const response = await fetch(new URL("/changes-since", server.url));
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(html).toContain("Missing version");
  });

  test("clears versions cache and redirects to version list", async () => {
    const server = createTestServer();

    const response = await fetch(new URL("/clear-versions", server.url), {
      method: "POST",
      redirect: "manual",
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/");
  });
});

function createTestServer(
  figmaOptions: InMemoryFigmaAPIOptions = {},
): ReturnType<typeof createFigmaDiffServer> {
  const server = createFigmaDiffServer(
    {
      fileKey: "AbCdEfGhIjKlMnOpQrStUv",
      fileName: "Example-Figma-File",
      figmaAPI: new InMemoryFigmaAPI(figmaOptions),
    },
    {
      port: 0,
    },
  );

  servers.push(server);
  return server;
}

function cloneFile(file: GetFileResponse): GetFileResponse {
  return structuredClone(file);
}

function setFrameX(file: GetFileResponse, frameId: string, x: number): void {
  const document = file.document as Record<string, unknown>;
  const pages = document.children as Record<string, unknown>[];

  for (const page of pages) {
    const children = page.children as Record<string, unknown>[] | undefined;
    const frame = children?.find((child) => child.id === frameId);
    if (frame === undefined) {
      continue;
    }

    const box = frame.absoluteBoundingBox as Record<string, unknown>;
    box.x = x;
    return;
  }
}
