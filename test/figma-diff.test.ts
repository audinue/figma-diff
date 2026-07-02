import { describe, expect, test } from "bun:test";
import type { GetFileResponse } from "../src/core/figma-api";
import {
  diffFigmaFiles,
  type FigmaDiffPage,
} from "../src/core/figma-diff";
import {
  sampleCurrentFile,
  sampleOlderFile,
} from "../src/core/sample-figma-data";

function nestedFile(childX: number): GetFileResponse {
  return {
    name: "Nested file",
    role: "owner",
    lastModified: "2026-06-30T00:00:00Z",
    editorType: "figma",
    version: `nested-${childX}`,
    document: {
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      scrollBehavior: "SCROLLS",
      children: [
        {
          id: "1:1",
          name: "Page",
          type: "CANVAS",
          scrollBehavior: "SCROLLS",
          children: [
            {
              id: "2:1",
              name: "Parent",
              type: "FRAME",
              scrollBehavior: "SCROLLS",
              absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
              children: [
                {
                  id: "3:1",
                  name: "Child",
                  type: "FRAME",
                  scrollBehavior: "SCROLLS",
                  absoluteBoundingBox: {
                    x: childX,
                    y: 20,
                    width: 50,
                    height: 50,
                  },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
    components: {},
    componentSets: {},
    schemaVersion: 0,
    styles: {},
  } as GetFileResponse;
}

describe("diffFigmaFiles", () => {
  test("diffs two Figma file response excerpts", () => {
    const diff = diffFigmaFiles(sampleOlderFile, sampleCurrentFile);

    expect(diff.summary.before).toMatchObject({
      name: "AgentReach Website & Web app",
      version: "2366075322438973666",
      lastModified: "2026-06-17T15:05:36Z",
      pages: 3,
      topFrames: 2,
    });
    expect(diff.summary.after).toMatchObject({
      name: "AgentReach Website & Web app",
      version: "2369347764861345445",
      lastModified: "2026-06-26T11:08:50Z",
      pages: 3,
      topFrames: 3,
    });
    expect(diff.summary.counts).toEqual({
      pagesAdded: 0,
      pagesRemoved: 0,
      pagesChanged: 2,
      pagesUnchanged: 1,
      framesAdded: 1,
      framesRemoved: 0,
      framesChanged: 1,
    });
  });

  test("returns unchanged result for the same Figma file response", () => {
    const diff = diffFigmaFiles(sampleOlderFile, sampleOlderFile);

    expect(diff.summary.counts).toEqual({
      pagesAdded: 0,
      pagesRemoved: 0,
      pagesChanged: 0,
      pagesUnchanged: 3,
      framesAdded: 0,
      framesRemoved: 0,
      framesChanged: 0,
    });
    expect(diff.pages.every((page) => page.status === "unchanged")).toBe(true);
  });

  test("diffs child frames included by depth 3 responses", () => {
    const diff = diffFigmaFiles(nestedFile(10), nestedFile(30));

    expect(diff.summary.before).toMatchObject({
      topFrames: 1,
      nodes: 2,
    });
    expect(diff.summary.counts).toMatchObject({
      pagesChanged: 1,
      framesChanged: 1,
    });

    const page = diff.pages[0];
    if (page === undefined || page.status !== "changed") {
      throw new Error("Expected nested page to be changed");
    }

    expect(page.frames).toHaveLength(1);
    expect(page.frames[0]).toMatchObject({
      status: "changed",
      id: "3:1",
      name: "Child",
      changes: [
        {
          field: "bounds",
          before: { x: 10, y: 20, width: 50, height: 50 },
          after: { x: 30, y: 20, width: 50, height: 50 },
        },
      ],
    });
  });

  test("returns typed FigmaDiffPage entries", () => {
    const diff = diffFigmaFiles(sampleOlderFile, sampleCurrentFile);
    const websitePage: FigmaDiffPage | undefined = diff.pages.find(
      (page) => page.page.id === "0:1",
    );
    const registrationPage: FigmaDiffPage | undefined = diff.pages.find(
      (page) => page.page.id === "4569:347315",
    );
    const receivingPage: FigmaDiffPage | undefined = diff.pages.find(
      (page) => page.page.id === "4235:262745",
    );

    if (
      websitePage === undefined ||
      registrationPage === undefined ||
      receivingPage === undefined
    ) {
      throw new Error("Expected fixture pages to exist");
    }

    expect(websitePage).toMatchObject({
      status: "unchanged",
      page: {
        id: "0:1",
        name: "Website",
        beforeName: "Website",
        index: 0,
        beforeIndex: 0,
      },
      pageChanges: [],
      frames: [],
    });

    if (registrationPage.status !== "changed") {
      throw new Error("Expected registration page to be changed");
    }

    expect(registrationPage.pageChanges).toEqual([
      {
        field: "topFrameCount",
        before: 1,
        after: 2,
      },
    ]);
    expect(registrationPage.frames).toHaveLength(1);
    expect(registrationPage.frames[0]).toMatchObject({
      status: "added",
      frame: {
        id: "5646:20208",
        name: "DTP - Registration - Create office agent account",
        type: "FRAME",
      },
    });

    if (receivingPage.status !== "changed") {
      throw new Error("Expected receiving page to be changed");
    }

    expect(receivingPage.frames[0]).toMatchObject({
      status: "changed",
      id: "4780:383317",
      name: "Screenshot 2026-05-18 at 16.31.14 1",
      beforeName: "Screenshot 2026-05-18 at 16.31.14 1",
      changes: [
        {
          field: "bounds",
          before: {
            x: -412,
            y: -65378,
            width: 685,
            height: 538,
          },
          after: {
            x: 16738,
            y: -65378,
            width: 685,
            height: 538,
          },
        },
      ],
    });
  });
});
