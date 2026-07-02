import { afterEach, describe, expect, test } from "bun:test";
import { createFigmaDiffServer } from "../src/core/server";
import { InMemoryFigmaAPI } from "../src/infra/in-memory-figma-api";

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
});

function createTestServer(): ReturnType<typeof createFigmaDiffServer> {
  const server = createFigmaDiffServer(
    {
      fileKey: "AbCdEfGhIjKlMnOpQrStUv",
      fileName: "Example-Figma-File",
      figmaAPI: new InMemoryFigmaAPI(),
    },
    {
      port: 0,
    },
  );

  servers.push(server);
  return server;
}
