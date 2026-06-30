import type {
  FigmaDiffChange,
  FigmaDiffFrame,
  FigmaDiffPage,
  FigmaDiffResult,
  FigmaDiffValue,
} from "./figma-diff";
import { html, raw } from "./html";

export type DiffResultViewOptions = {
  fileKey: string;
  fileName?: string;
  title?: string;
  showUnchangedPages?: boolean;
};

export function renderDiffResultView(
  diff: FigmaDiffResult,
  options: DiffResultViewOptions,
): string {
  const title = options.title ?? "Figma Diff";
  const visiblePages =
    options.showUnchangedPages === true
      ? diff.pages
      : diff.pages.filter((page) => page.status !== "unchanged");

  return html`
    <main class="diff-result">
      <header class="diff-result__header">
        <h1>${title}</h1>
        <p>${diff.summary.before.version} -> ${diff.summary.after.version}</p>
      </header>
      <section class="diff-result__summary" aria-label="Summary">
        ${raw(renderSummaryItem("Pages added", diff.summary.counts.pagesAdded))}
        ${raw(renderSummaryItem("Pages removed", diff.summary.counts.pagesRemoved))}
        ${raw(renderSummaryItem("Pages changed", diff.summary.counts.pagesChanged))}
        ${raw(renderSummaryItem("Frames added", diff.summary.counts.framesAdded))}
        ${raw(renderSummaryItem("Frames removed", diff.summary.counts.framesRemoved))}
        ${raw(renderSummaryItem("Frames changed", diff.summary.counts.framesChanged))}
      </section>
      <section class="diff-result__files" aria-label="Files">
        <div>
          <h2>Before</h2>
          <p>${diff.summary.before.name}</p>
          <p>${diff.summary.before.lastModified}</p>
        </div>
        <div>
          <h2>After</h2>
          <p>${diff.summary.after.name}</p>
          <p>${diff.summary.after.lastModified}</p>
        </div>
      </section>
      <section class="diff-result__pages" aria-label="Changed pages">
        ${visiblePages.map((page) => raw(renderPage(page, diff, options)))}
      </section>
    </main>
  `;
}

function renderSummaryItem(label: string, value: number): string {
  return html`
    <div class="diff-result__summary-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderPage(
  page: FigmaDiffPage,
  diff: FigmaDiffResult,
  options: DiffResultViewOptions,
): string {
  if (page.status === "added") {
    return html`
      <article class="diff-page diff-page--added">
        <h2>+ ${page.page.name}</h2>
        <p>${page.page.id}</p>
        <a href="${figmaNodeUrl(options, page.page.id)}" target="_blank" rel="noreferrer">Open page in Figma</a>
        ${page.page.topFrames.map((frame) => raw(html`
          <div class="diff-frame diff-frame--added">
            <h3>+ ${frame.name}</h3>
            <p>${frame.type} · ${frame.id}</p>
            <a href="${figmaNodeUrl(options, frame.id)}" target="_blank" rel="noreferrer">Open frame in Figma</a>
          </div>
        `))}
      </article>
    `;
  }

  if (page.status === "removed") {
    return html`
      <article class="diff-page diff-page--removed">
        <h2>- ${page.page.name}</h2>
        <p>${page.page.id}</p>
        <a href="${figmaNodeUrl(options, page.page.id, diff.summary.before.version)}" target="_blank" rel="noreferrer">Open page in Figma</a>
        ${page.page.topFrames.map((frame) => raw(html`
          <div class="diff-frame diff-frame--removed">
            <h3>- ${frame.name}</h3>
            <p>${frame.type} · ${frame.id}</p>
            <a href="${figmaNodeUrl(options, frame.id, diff.summary.before.version)}" target="_blank" rel="noreferrer">Open frame in Figma</a>
          </div>
        `))}
      </article>
    `;
  }

  if (!("frames" in page)) {
    throw new Error(`Unexpected page diff status: ${page.status}`);
  }

  return html`
    <article class="diff-page diff-page--${page.status}">
      <h2>${page.status === "changed" ? "~" : "="} ${page.page.beforeName === page.page.name
        ? page.page.name
        : `${page.page.beforeName} -> ${page.page.name}`}</h2>
      <p>${page.page.id}</p>
      <div class="diff-page__links">
        <a href="${figmaNodeUrl(options, page.page.id, diff.summary.before.version)}" target="_blank" rel="noreferrer">Before in Figma</a>
        <a href="${figmaNodeUrl(options, page.page.id)}" target="_blank" rel="noreferrer">After in Figma</a>
      </div>
      ${page.pageChanges.length === 0
        ? ""
        : raw(html`<div class="diff-changes">${page.pageChanges.map((change) => raw(renderChange(change)))}</div>`)}
      <div class="diff-page__frames">
        ${page.frames.map((frame) => raw(renderFrame(frame, diff, options)))}
      </div>
    </article>
  `;
}

function renderFrame(
  frame: FigmaDiffFrame,
  diff: FigmaDiffResult,
  options: DiffResultViewOptions,
): string {
  if (frame.status !== "changed") {
    const version =
      frame.status === "added" ? undefined : diff.summary.before.version;
    const marker = frame.status === "added" ? "+" : "-";

    return html`
      <section class="diff-frame diff-frame--${frame.status}">
        <h3>${marker} ${frame.frame.name}</h3>
        <p>${frame.frame.type} · ${frame.frame.id}</p>
        <a href="${figmaNodeUrl(options, frame.frame.id, version)}" target="_blank" rel="noreferrer">Open frame in Figma</a>
      </section>
    `;
  }

  return html`
    <section class="diff-frame diff-frame--changed">
      <h3>~ ${frame.beforeName === frame.name ? frame.name : `${frame.beforeName} -> ${frame.name}`}</h3>
      <p>${frame.id}</p>
      <div class="diff-frame__links">
        <a href="${figmaNodeUrl(options, frame.id, diff.summary.before.version)}" target="_blank" rel="noreferrer">Before in Figma</a>
        <a href="${figmaNodeUrl(options, frame.id)}" target="_blank" rel="noreferrer">After in Figma</a>
      </div>
      <div class="diff-changes">
        ${frame.changes.map((change) => raw(renderChange(change)))}
      </div>
    </section>
  `;
}

function renderChange(change: FigmaDiffChange): string {
  return html`
    <dl class="diff-change">
      <dt>${change.field}</dt>
      <dd>
        <span>Before</span>
        <code>${formatValue(change.before)}</code>
      </dd>
      <dd>
        <span>After</span>
        <code>${formatValue(change.after)}</code>
      </dd>
    </dl>
  `;
}

function formatValue(value: FigmaDiffValue): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function figmaNodeUrl(
  options: DiffResultViewOptions,
  nodeId: string,
  version?: string,
): string {
  return figmaFileUrl(options.fileKey, options.fileName, nodeId, version);
}

function figmaFileUrl(
  fileKey: string,
  fileName: string | undefined,
  nodeId: string,
  version: string | undefined,
): string {
  const filePath = fileName === undefined || fileName === ""
    ? encodeURIComponent(fileKey)
    : `${encodeURIComponent(fileKey)}/${encodeURIComponent(fileName)}`;
  const params = new URLSearchParams();

  if (version !== undefined) {
    params.set("version-id", version);
  }

  params.set("node-id", nodeId.replaceAll(":", "-"));

  return `https://www.figma.com/design/${filePath}?${params.toString()}`;
}
