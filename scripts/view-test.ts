import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import {
  diffFigmaFiles,
  renderDiffResultView,
  renderLayoutView,
  renderVersionListView,
} from "../src";
import {
  sampleCurrentFile,
  sampleOlderFile,
  sampleVersions,
} from "../src/sample-figma-data";

const fileKey = process.env.FIGMA_FILE_KEY ?? "AbCdEfGhIjKlMnOpQrStUv";
const fileName = process.env.FIGMA_FILE_NAME ?? "Example-Figma-File";
const screenshotsDir = new URL("../screenshots/", import.meta.url);

await mkdir(screenshotsDir, { recursive: true });

const diff = diffFigmaFiles(sampleOlderFile, sampleCurrentFile);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: {
    width: 1440,
    height: 1200,
  },
  deviceScaleFactor: 1,
});

try {
  await screenshotHtml(
    page,
    renderLayoutView({
      title: "Figma Versions",
      body: renderVersionListView(sampleVersions),
    }),
    new URL("version-list.png", screenshotsDir),
  );

  await screenshotHtml(
    page,
    renderLayoutView({
      title: "Figma Diff",
      body: renderDiffResultView(diff, { fileKey, fileName }),
    }),
    new URL("diff-result.png", screenshotsDir),
  );
} finally {
  await browser.close();
}

async function screenshotHtml(
  page: import("playwright").Page,
  markup: string,
  outputUrl: URL,
): Promise<void> {
  await page.setContent(markup, {
    waitUntil: "load",
  });

  await page.screenshot({
    path: outputUrl.pathname,
    fullPage: true,
  });
}
