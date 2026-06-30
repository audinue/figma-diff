import type { GetFileResponse } from "./figma-api";

export type FigmaDiffOptions = {
  includeOrder?: boolean;
};

export type FigmaDiffStatus = "added" | "removed" | "changed" | "unchanged";

export type FigmaDiffValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | FigmaDiffValue[]
  | { [key: string]: FigmaDiffValue };

export type FigmaDiffChange = {
  field: string;
  before: FigmaDiffValue;
  after: FigmaDiffValue;
};

export type FigmaDiffSummarySide = {
  name: string;
  version: string;
  lastModified: string;
  pages: number;
  topFrames: number;
  nodes: number;
};

export type FigmaDiffSummary = {
  before: FigmaDiffSummarySide;
  after: FigmaDiffSummarySide;
  counts: {
    pagesAdded: number;
    pagesRemoved: number;
    pagesChanged: number;
    pagesUnchanged: number;
    framesAdded: number;
    framesRemoved: number;
    framesChanged: number;
  };
};

export type FigmaDiffFrame =
  | {
      status: "added" | "removed";
      frame: FigmaDiffNode;
    }
  | {
      status: "changed";
      id: string;
      name: string;
      beforeName: string;
      changes: FigmaDiffChange[];
    };

export type FigmaDiffPage =
  | {
      status: "added" | "removed";
      page: FigmaDiffPageSnapshot;
    }
  | {
      status: "changed" | "unchanged";
      page: {
        id: string;
        name: string;
        beforeName: string;
        index: number;
        beforeIndex: number;
      };
      pageChanges: FigmaDiffChange[];
      frames: FigmaDiffFrame[];
    };

export type FigmaDiffResult = {
  summary: FigmaDiffSummary;
  pages: FigmaDiffPage[];
};

type FigmaNode = Record<string, unknown>;

export type FigmaDiffNode = {
  [key: string]: FigmaDiffValue;
  id: string;
  parentId: string | undefined;
  index: number;
  depth: number;
  name: string;
  type: string;
};

export type FigmaDiffPageSnapshot = {
  [key: string]: FigmaDiffValue;
  id: string;
  index: number;
  name: string;
  type: string;
  topFrames: FigmaDiffNode[];
  diffNodes: FigmaDiffNode[];
};

export function diffFigmaFiles(
  beforeFile: GetFileResponse,
  afterFile: GetFileResponse,
  options: FigmaDiffOptions = {},
): FigmaDiffResult {
  const beforePages = beforeFile.document.children.map(meaningfulPage);
  const afterPages = afterFile.document.children.map(meaningfulPage);
  const beforeById = indexById(beforePages);
  const afterById = indexById(afterPages);
  const pages: FigmaDiffPage[] = [];
  const ignoredKeys = options.includeOrder === true ? new Set<string>() : new Set(["index"]);

  for (const page of beforePages) {
    if (!afterById.has(page.id)) {
      pages.push({ status: "removed", page });
    }
  }

  for (const page of afterPages) {
    const before = beforeById.get(page.id);
    if (before === undefined) {
      pages.push({ status: "added", page });
      continue;
    }

    const pageChanges = diffObjects(
      before,
      page,
      new Set(["topFrames", "diffNodes", ...ignoredKeys]),
    );
    const beforeFramesById = indexById(before.diffNodes);
    const afterFramesById = indexById(page.diffNodes);
    const frames: FigmaDiffFrame[] = [];

    for (const frame of before.diffNodes) {
      if (!afterFramesById.has(frame.id)) {
        frames.push({ status: "removed", frame });
      }
    }

    for (const frame of page.diffNodes) {
      const oldFrame = beforeFramesById.get(frame.id);
      if (oldFrame === undefined) {
        frames.push({ status: "added", frame });
        continue;
      }

      const changes = diffObjects(oldFrame, frame, ignoredKeys);
      if (changes.length > 0) {
        frames.push({
          status: "changed",
          id: frame.id,
          name: frame.name,
          beforeName: oldFrame.name,
          changes,
        });
      }
    }

    pages.push({
      status: pageChanges.length > 0 || frames.length > 0 ? "changed" : "unchanged",
      page: {
        id: page.id,
        name: page.name,
        beforeName: before.name,
        index: page.index,
        beforeIndex: before.index,
      },
      pageChanges,
      frames,
    });
  }

  return {
    summary: {
      before: summarizeFile(beforeFile, beforePages),
      after: summarizeFile(afterFile, afterPages),
      counts: {
        pagesAdded: pages.filter((page) => page.status === "added").length,
        pagesRemoved: pages.filter((page) => page.status === "removed").length,
        pagesChanged: pages.filter((page) => page.status === "changed").length,
        pagesUnchanged: pages.filter((page) => page.status === "unchanged").length,
        framesAdded: pages.flatMap(pageFrames).filter((frame) => frame.status === "added").length,
        framesRemoved: pages.flatMap(pageFrames).filter((frame) => frame.status === "removed").length,
        framesChanged: pages.flatMap(pageFrames).filter((frame) => frame.status === "changed").length,
      },
    },
    pages,
  };
}

function summarizeFile(file: GetFileResponse, pages: FigmaDiffPageSnapshot[]): FigmaDiffSummarySide {
  return {
    name: file.name,
    version: file.version,
    lastModified: file.lastModified,
    pages: pages.length,
    topFrames: pages.reduce((sum, page) => sum + page.topFrames.length, 0),
    nodes: pages.reduce((sum, page) => sum + page.diffNodes.length, 0),
  };
}

function pageFrames(page: FigmaDiffPage): FigmaDiffFrame[] {
  return "frames" in page ? page.frames : [];
}

function meaningfulPage(page: FigmaNode, index: number): FigmaDiffPageSnapshot {
  const topNodes = Array.isArray(page.children) ? page.children : [];
  const topFrames = topNodes.map((node, nodeIndex) =>
    meaningfulNode(recordValue(node), nodeIndex, page.id),
  );

  return {
    id: stringValue(page.id),
    index,
    name: stringValue(page.name),
    type: stringValue(page.type),
    topFrameCount: topNodes.length,
    backgroundColor: colorToHex(nodeValue(page.backgroundColor)),
    prototypeStartNodeID: diffValue(page.prototypeStartNodeID),
    flowStartingPointsCount: Array.isArray(page.flowStartingPoints)
      ? page.flowStartingPoints.length
      : 0,
    topFrames,
    diffNodes: topNodes.flatMap((node, nodeIndex) =>
      meaningfulNodeTree(recordValue(node), nodeIndex, page.id),
    ),
  };
}

function meaningfulNodeTree(
  node: FigmaNode,
  index: number,
  parentId: unknown,
  depth = 1,
): FigmaDiffNode[] {
  const current = meaningfulNode(node, index, parentId, depth);
  const children = Array.isArray(node.children) ? node.children : [];

  return [
    current,
    ...children.flatMap((child, childIndex) =>
      meaningfulNodeTree(recordValue(child), childIndex, node.id, depth + 1),
    ),
  ];
}

function meaningfulNode(
  node: FigmaNode,
  index: number,
  parentId: unknown,
  depth = 1,
): FigmaDiffNode {
  return {
    id: stringValue(node.id),
    parentId: typeof parentId === "string" ? parentId : undefined,
    index,
    depth,
    name: stringValue(node.name),
    type: stringValue(node.type),
    visible: node.visible !== false,
    locked: node.locked === true,
    childrenCount: Array.isArray(node.children) ? node.children.length : 0,
    bounds: summarizeBox(nodeValue(node.absoluteBoundingBox)),
    clipsContent: diffValue(node.clipsContent),
    opacity: round(node.opacity),
    blendMode: diffValue(node.blendMode),
    fills: summarizePaints(arrayValue(node.fills ?? node.background)),
    strokes: summarizePaints(arrayValue(node.strokes)),
    strokeWeight: round(node.strokeWeight),
    strokeAlign: diffValue(node.strokeAlign),
    effects: summarizeEffects(arrayValue(node.effects)),
    layoutMode: diffValue(node.layoutMode),
    primaryAxisSizingMode: diffValue(node.primaryAxisSizingMode),
    counterAxisSizingMode: diffValue(node.counterAxisSizingMode),
    primaryAxisAlignItems: diffValue(node.primaryAxisAlignItems),
    counterAxisAlignItems: diffValue(node.counterAxisAlignItems),
    itemSpacing: round(node.itemSpacing),
    paddingLeft: round(node.paddingLeft),
    paddingRight: round(node.paddingRight),
    paddingTop: round(node.paddingTop),
    paddingBottom: round(node.paddingBottom),
    cornerRadius: round(node.cornerRadius),
    layoutGrids: summarizeLayoutGrids(arrayValue(node.layoutGrids)),
    componentId: diffValue(node.componentId),
    componentPropertyReferences: diffValue(node.componentPropertyReferences),
  };
}

function summarizePaints(paints: FigmaNode[]): FigmaDiffValue[] {
  return paints.map(summarizePaint).filter((paint) => paint !== null);
}

function summarizePaint(paint: FigmaNode): FigmaDiffValue {
  if (paint.visible === false) {
    return "hidden";
  }

  const type = stringValue(paint.type, "unknown");
  if (type === "SOLID") {
    return `SOLID ${colorToHex(nodeValue(paint.color))}`;
  }

  if (type.startsWith("GRADIENT")) {
    return type;
  }

  if (type === "IMAGE") {
    return `IMAGE ${stringValue(paint.imageRef, "unknown")}`;
  }

  return type;
}

function summarizeEffects(effects: FigmaNode[]): FigmaDiffValue[] {
  return effects
    .filter((effect) => effect.visible !== false)
    .map((effect) => ({
      type: diffValue(effect.type),
      radius: round(effect.radius),
      color: colorToHex(nodeValue(effect.color)),
      offset: summarizePoint(nodeValue(effect.offset)),
    }));
}

function summarizePoint(point: FigmaNode | null): FigmaDiffValue {
  if (point === null) {
    return undefined;
  }

  return {
    x: round(point.x),
    y: round(point.y),
  };
}

function summarizeBox(box: FigmaNode | null): FigmaDiffValue {
  if (box === null) {
    return null;
  }

  return {
    x: round(box.x),
    y: round(box.y),
    width: round(box.width),
    height: round(box.height),
  };
}

function summarizeLayoutGrids(layoutGrids: FigmaNode[]): FigmaDiffValue[] {
  return layoutGrids
    .filter((grid) => grid.visible !== false)
    .map((grid) => ({
      pattern: diffValue(grid.pattern),
      alignment: diffValue(grid.alignment),
      count: diffValue(grid.count),
      sectionSize: round(grid.sectionSize),
      gutterSize: round(grid.gutterSize),
      offset: round(grid.offset),
    }));
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function diffObjects(
  before: Record<string, FigmaDiffValue>,
  after: Record<string, FigmaDiffValue>,
  ignoredKeys: Set<string>,
): FigmaDiffChange[] {
  const changes: FigmaDiffChange[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of [...keys].sort()) {
    if (ignoredKeys.has(key)) {
      continue;
    }

    if (!isEqual(before[key], after[key])) {
      changes.push({ field: key, before: before[key], after: after[key] });
    }
  }

  return changes;
}

function isEqual(before: FigmaDiffValue, after: FigmaDiffValue): boolean {
  return JSON.stringify(before) === JSON.stringify(after);
}

function colorToHex(color: FigmaNode | null): string | null {
  if (color === null) {
    return null;
  }

  const r = colorChannelToHex(color.r);
  const g = colorChannelToHex(color.g);
  const b = colorChannelToHex(color.b);
  const a = color.a === undefined ? 1 : round(color.a);

  return a === 1 ? `#${r}${g}${b}` : `#${r}${g}${b}@${a}`;
}

function colorChannelToHex(value: unknown): string {
  return Math.round(numberValue(value) * 255)
    .toString(16)
    .padStart(2, "0");
}

function round(value: unknown): number | undefined {
  return typeof value === "number" ? Number(value.toFixed(2)) : undefined;
}

function nodeValue(value: unknown): FigmaNode | null {
  return isRecord(value) ? value : null;
}

function recordValue(value: unknown): FigmaNode {
  return isRecord(value) ? value : {};
}

function arrayValue(value: unknown): FigmaNode[] {
  return Array.isArray(value) ? value.map(recordValue) : [];
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function diffValue(value: unknown): FigmaDiffValue {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(diffValue);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, diffValue(entry)]),
    );
  }

  return String(value);
}

function isRecord(value: unknown): value is FigmaNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
