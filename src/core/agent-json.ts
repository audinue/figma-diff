import type {
  ChangesSinceResult,
  ChangesSinceTopLevelNode,
  ChangesSinceTopLevelNodeStep,
  ChangesSinceVersion,
} from "./changes-since";
import type {
  FigmaDiffChange,
  FigmaDiffFrame,
  FigmaDiffPage,
  FigmaDiffResult,
  FigmaDiffSummarySide,
  FigmaDiffValue,
} from "./figma-diff";
import type { GetFileVersionsResponse } from "./figma-api";

export type AgentJsonOptions = {
  fileKey: string;
  fileName?: string;
};

export function buildAgentVersionsJson(
  versionsResponse: GetFileVersionsResponse,
): unknown {
  return {
    kind: "figma-versions",
    versionCount: versionsResponse.versions.length,
    versions: versionsResponse.versions.map((version) => ({
      id: version.id,
      label: version.label,
      description: version.description,
      createdAt: version.created_at,
      user: version.user.handle,
      diffUrl: `/diff.json?version=${encodeURIComponent(version.id)}`,
      changesSinceUrl: `/changes-since.json?version=${encodeURIComponent(version.id)}`,
    })),
  };
}

export function buildAgentDiffJson(
  diff: FigmaDiffResult,
  options: AgentJsonOptions,
): unknown {
  return {
    kind: "figma-diff",
    summary: diff.summary,
    warnings: diffWarnings(diff),
    changedPages: diff.pages
      .filter((page) => page.status !== "unchanged")
      .map((page) => serializePage(page, diff, options)),
  };
}

export function buildAgentChangesSinceJson(
  result: ChangesSinceResult,
  options: AgentJsonOptions,
): unknown {
  return {
    kind: "figma-changes-since",
    selected: result.selected,
    current: result.current,
    summary: {
      versionSteps: result.steps.length,
      topLevelNodesChanged: result.topLevelNodes.length,
      totals: sumChanges(result),
    },
    warnings: changesSinceWarnings(result),
    topLevelNodes: result.topLevelNodes.map((node) =>
      serializeTopLevelNode(node, options),
    ),
  };
}

function serializeTopLevelNode(
  node: ChangesSinceTopLevelNode,
  options: AgentJsonOptions,
): unknown {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    steps: node.steps.map((step) => serializeTopLevelNodeStep(step, options)),
  };
}

function serializeTopLevelNodeStep(
  step: ChangesSinceTopLevelNodeStep,
  options: AgentJsonOptions,
): unknown {
  return {
    before: serializeVersion(step.before),
    after: serializeVersion(step.after),
    page: serializePage(step.page, undefined, options),
  };
}

function serializeVersion(version: ChangesSinceVersion): unknown {
  return {
    id: version.id,
    label: version.label,
    createdAt: version.createdAt,
  };
}

function serializePage(
  page: FigmaDiffPage,
  diff: FigmaDiffResult | undefined,
  options: AgentJsonOptions,
): unknown {
  if (page.status === "added" || page.status === "removed") {
    const version = page.status === "removed" ? diff?.summary.before.version : undefined;

    return {
      status: page.status,
      id: page.page.id,
      name: page.page.name,
      type: page.page.type,
      topFrameCount: page.page.topFrames.length,
      figmaUrl: figmaNodeUrl(options, page.page.id, version),
      frames: page.page.topFrames.map((frame) => ({
        status: page.status,
        id: frame.id,
        name: frame.name,
        type: frame.type,
        depth: frame.depth,
        figmaUrl: figmaNodeUrl(options, frame.id, version),
      })),
    };
  }

  if (!("frames" in page)) {
    throw new Error(`Unexpected page diff status: ${page.status}`);
  }

  return {
    status: page.status,
    id: page.page.id,
    name: page.page.name,
    beforeName: page.page.beforeName,
    beforeFigmaUrl: diff === undefined
      ? undefined
      : figmaNodeUrl(options, page.page.id, diff.summary.before.version),
    afterFigmaUrl: figmaNodeUrl(options, page.page.id),
    pageChanges: page.pageChanges.map(serializeChange),
    frames: page.frames.map((frame) => serializeFrame(frame, diff, options)),
  };
}

function serializeFrame(
  frame: FigmaDiffFrame,
  diff: FigmaDiffResult | undefined,
  options: AgentJsonOptions,
): unknown {
  if (frame.status === "changed") {
    return {
      status: frame.status,
      id: frame.id,
      name: frame.name,
      beforeName: frame.beforeName,
      beforeFigmaUrl: diff === undefined
        ? undefined
        : figmaNodeUrl(options, frame.id, diff.summary.before.version),
      afterFigmaUrl: figmaNodeUrl(options, frame.id),
      changes: frame.changes.map(serializeChange),
    };
  }

  const version = frame.status === "removed" ? diff?.summary.before.version : undefined;

  return {
    status: frame.status,
    id: frame.frame.id,
    name: frame.frame.name,
    type: frame.frame.type,
    depth: frame.frame.depth,
    figmaUrl: figmaNodeUrl(options, frame.frame.id, version),
  };
}

function serializeChange(change: FigmaDiffChange): unknown {
  return {
    field: change.field,
    before: change.before,
    after: change.after,
    summary: `${change.field}: ${formatValue(change.before)} -> ${formatValue(change.after)}`,
  };
}

function sumChanges(result: ChangesSinceResult): Record<string, number> {
  const totals = {
    pagesAdded: 0,
    pagesRemoved: 0,
    pagesChanged: 0,
    framesAdded: 0,
    framesRemoved: 0,
    framesChanged: 0,
  };

  for (const step of result.steps) {
    totals.pagesAdded += step.diff.summary.counts.pagesAdded;
    totals.pagesRemoved += step.diff.summary.counts.pagesRemoved;
    totals.pagesChanged += step.diff.summary.counts.pagesChanged;
    totals.framesAdded += step.diff.summary.counts.framesAdded;
    totals.framesRemoved += step.diff.summary.counts.framesRemoved;
    totals.framesChanged += step.diff.summary.counts.framesChanged;
  }

  return totals;
}

function changesSinceWarnings(result: ChangesSinceResult): string[] {
  const warnings: string[] = [];

  if (new Date(result.selected.createdAt) > new Date(result.current.createdAt)) {
    warnings.push(
      "Selected version is newer than current file metadata. The current file cache may be stale.",
    );
  }

  return warnings;
}

function diffWarnings(diff: FigmaDiffResult): string[] {
  const warnings: string[] = [];

  if (isNewer(diff.summary.before, diff.summary.after)) {
    warnings.push(
      "Before file is newer than after file. The cached current file may be stale.",
    );
  }

  return warnings;
}

function isNewer(before: FigmaDiffSummarySide, after: FigmaDiffSummarySide): boolean {
  return new Date(before.lastModified) > new Date(after.lastModified);
}

function formatValue(value: FigmaDiffValue): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function figmaNodeUrl(
  options: AgentJsonOptions,
  nodeId: string,
  version?: string,
): string {
  const filePath = options.fileName === undefined || options.fileName === ""
    ? encodeURIComponent(options.fileKey)
    : `${encodeURIComponent(options.fileKey)}/${encodeURIComponent(options.fileName)}`;
  const params = new URLSearchParams();

  if (version !== undefined) {
    params.set("version-id", version);
  }

  params.set("node-id", nodeId.replaceAll(":", "-"));

  return `https://www.figma.com/design/${filePath}?${params.toString()}`;
}
