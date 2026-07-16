import type { FigmaDiffPage, FigmaDiffResult } from "./figma-diff";
import { diffFigmaFiles } from "./figma-diff";
import type {
  FigmaAPI,
  GetFileResponse,
  GetFileVersionsResponse,
} from "./figma-api";

export type ChangesSinceOptions = {
  version: string;
  depth: number;
};

export type ChangesSinceVersion = {
  id: string;
  label?: string | null;
  createdAt: string;
};

export type ChangesSinceStep = {
  before: ChangesSinceVersion;
  after: ChangesSinceVersion;
  diff: FigmaDiffResult;
};

export type ChangesSinceTopLevelNode = {
  id: string;
  name: string;
  type: string;
  steps: ChangesSinceTopLevelNodeStep[];
};

export type ChangesSinceTopLevelNodeStep = {
  before: ChangesSinceVersion;
  after: ChangesSinceVersion;
  page: FigmaDiffPage;
};

export type ChangesSinceResult = {
  selected: ChangesSinceVersion;
  current: ChangesSinceVersion;
  steps: ChangesSinceStep[];
  topLevelNodes: ChangesSinceTopLevelNode[];
};

type Version = GetFileVersionsResponse["versions"][number];

type VersionSnapshot = {
  version: ChangesSinceVersion;
  file: GetFileResponse;
};

export async function buildChangesSince(
  figmaAPI: FigmaAPI,
  options: ChangesSinceOptions,
): Promise<ChangesSinceResult> {
  const [versionsResponse, currentFile] = await Promise.all([
    figmaAPI.getFileVersions(),
    figmaAPI.getFile({ depth: options.depth }),
  ]);
  const versions = versionsResponse.versions;
  const selectedIndex = versions.findIndex((version) => version.id === options.version);

  if (selectedIndex === -1) {
    throw new Error(`Figma version not found: ${options.version}`);
  }

  const selectedVersion = versions[selectedIndex];
  if (selectedVersion === undefined) {
    throw new Error(`Figma version not found: ${options.version}`);
  }

  const currentVersion = fileVersion(currentFile, versions.find(
    (version) => version.id === currentFile.version,
  ));
  const newerVersions = versions
    .slice(0, selectedIndex)
    .filter((version) => version.id !== currentFile.version)
    .reverse();
  const selectedAndNewerVersions = [
    selectedVersion,
    ...newerVersions,
  ];
  const historicalSnapshots = await Promise.all(
    selectedAndNewerVersions.map(async (version) => ({
      version: metadataVersion(version),
      file: await figmaAPI.getFile({
        version: version.id,
        depth: options.depth,
      }),
    })),
  );
  const snapshots: VersionSnapshot[] = [
    ...historicalSnapshots,
    {
      version: currentVersion,
      file: currentFile,
    },
  ];
  const steps = buildSteps(snapshots);

  const selectedSnapshot = snapshots[0];
  if (selectedSnapshot === undefined) {
    throw new Error(`Figma version not found: ${options.version}`);
  }

  return {
    selected: selectedSnapshot.version,
    current: currentVersion,
    steps,
    topLevelNodes: groupTopLevelNodes(steps),
  };
}

function buildSteps(snapshots: VersionSnapshot[]): ChangesSinceStep[] {
  const steps: ChangesSinceStep[] = [];

  for (let index = 0; index < snapshots.length - 1; index += 1) {
    const before = snapshots[index];
    const after = snapshots[index + 1];
    if (before === undefined || after === undefined) {
      continue;
    }
    const diff = diffFigmaFiles(before.file, after.file);

    if (hasChanges(diff)) {
      steps.push({
        before: before.version,
        after: after.version,
        diff,
      });
    }
  }

  return steps;
}

function groupTopLevelNodes(steps: ChangesSinceStep[]): ChangesSinceTopLevelNode[] {
  const nodes = new Map<string, ChangesSinceTopLevelNode>();

  for (const step of steps) {
    for (const page of step.diff.pages) {
      if (page.status === "unchanged") {
        continue;
      }

      const nodeKey = pageKey(page);
      const existing = nodes.get(nodeKey.id);
      const node = existing ?? {
        id: nodeKey.id,
        name: nodeKey.name,
        type: nodeKey.type,
        steps: [],
      };

      node.name = nodeKey.name;
      node.type = nodeKey.type;
      node.steps.push({
        before: step.before,
        after: step.after,
        page,
      });
      nodes.set(node.id, node);
    }
  }

  return [...nodes.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "en"),
  );
}

function pageKey(page: FigmaDiffPage): { id: string; name: string; type: string } {
  if (page.status === "added" || page.status === "removed") {
    return {
      id: page.page.id,
      name: page.page.name,
      type: page.page.type,
    };
  }

  return {
    id: page.page.id,
    name: page.page.name,
    type: "CANVAS",
  };
}

function hasChanges(diff: FigmaDiffResult): boolean {
  const counts = diff.summary.counts;

  return counts.pagesAdded > 0 ||
    counts.pagesRemoved > 0 ||
    counts.pagesChanged > 0 ||
    counts.framesAdded > 0 ||
    counts.framesRemoved > 0 ||
    counts.framesChanged > 0;
}

function fileVersion(
  file: GetFileResponse,
  metadata: Version | undefined,
): ChangesSinceVersion {
  return {
    id: file.version,
    label: metadata?.label,
    createdAt: metadata?.created_at ?? file.lastModified,
  };
}

function metadataVersion(version: Version): ChangesSinceVersion {
  return {
    id: version.id,
    label: version.label,
    createdAt: version.created_at,
  };
}
