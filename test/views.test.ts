import { describe, expect, test } from "bun:test";
import {
  diffFigmaFiles,
  renderLayoutView,
  renderDiffResultView,
  renderVersionListView,
} from "../src/index";
import {
  sampleCurrentFile,
  sampleOlderFile,
  sampleVersions,
} from "../src/sample-figma-data";

describe("renderVersionListView", () => {
  test("renders version links to diff page", () => {
    const markup = renderVersionListView(sampleVersions);

    expect(markup).toContain("<main class=\"version-list\">");
    expect(markup).toContain(
      "/diff?version=2369347764861345445",
    );
    expect(markup).toContain("Compare current file with this version");
    expect(markup).toContain("Jun 26,");
  });

  test("escapes dynamic title", () => {
    const markup = renderVersionListView(sampleVersions, {
      title: "<script>alert(1)</script>",
    });

    expect(markup).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(markup).not.toContain("<script>alert(1)</script>");
  });

  test("styles visited version links", () => {
    const markup = renderLayoutView({
      title: "Figma Versions",
      body: renderVersionListView(sampleVersions),
    });

    expect(markup).toContain(".version-list__item a:visited");
    expect(markup).toContain("--visited:");
  });
});

describe("renderDiffResultView", () => {
  test("renders detailed diff with Figma frame links", () => {
    const diff = diffFigmaFiles(sampleOlderFile, sampleCurrentFile);

    const markup = renderDiffResultView(diff, {
      fileKey: "AbCdEfGhIjKlMnOpQrStUv",
      fileName: "Example-Figma-File",
    });

    expect(markup).toContain("<main class=\"diff-result\">");
    expect(markup).toContain("Frames changed");
    expect(markup).toContain("Screenshot 2026-05-18 at 16.31.14 1");
    expect(markup).toContain("Before in Figma");
    expect(markup).toContain("After in Figma");
    expect(markup).toContain("target=\"_blank\" rel=\"noreferrer\"");
    expect(markup).toContain(
      "https://www.figma.com/design/AbCdEfGhIjKlMnOpQrStUv/Example-Figma-File?version-id=2366075322438973666&amp;node-id=4780-383317",
    );
    expect(markup).toContain(
      "https://www.figma.com/design/AbCdEfGhIjKlMnOpQrStUv/Example-Figma-File?node-id=4780-383317",
    );
    expect(markup).not.toContain("version-id=2369347764861345445");
  });
});
