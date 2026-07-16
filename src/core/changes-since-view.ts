import type {
  ChangesSinceResult,
  ChangesSinceTopLevelNode,
  ChangesSinceTopLevelNodeStep,
} from "./changes-since";
import type { FigmaDiffChange, FigmaDiffFrame, FigmaDiffValue } from "./figma-diff";
import { html, raw } from "./html";

export function renderChangesSinceView(result: ChangesSinceResult): string {
  return html`
    <main class="changes-since">
      <header class="changes-since__header">
        <h1>Changes since ${versionLabel(result.selected)}</h1>
        <p>${result.selected.id} -> ${result.current.id}</p>
      </header>
      <section class="changes-since__summary" aria-label="Summary">
        <div>
          <span>Version steps</span>
          <strong>${result.steps.length}</strong>
        </div>
        <div>
          <span>Top-level nodes changed</span>
          <strong>${result.topLevelNodes.length}</strong>
        </div>
      </section>
      ${result.topLevelNodes.length === 0
        ? raw(html`<p class="changes-since__empty">No changes found between this version and current.</p>`)
        : raw(html`
          <section class="changes-since__nodes" aria-label="Changed top-level nodes">
            ${result.topLevelNodes.map((node, index) =>
              raw(renderTopLevelNode(node, index === 0)),
            )}
          </section>
        `)}
    </main>
  `;
}

function renderTopLevelNode(
  node: ChangesSinceTopLevelNode,
  open: boolean,
): string {
  return html`
    <details class="changes-node" ${raw(open ? "open" : "")}>
      <summary>
        <span>
          <strong>${node.name}</strong>
          <small>${node.type} · ${node.id}</small>
        </span>
        <em>${node.steps.length} steps</em>
      </summary>
      <div class="changes-node__body">
        ${node.steps.map((step) => raw(renderNodeStep(step)))}
      </div>
    </details>
  `;
}

function renderNodeStep(step: ChangesSinceTopLevelNodeStep): string {
  return html`
    <article class="changes-step">
      <header>
        <h2>${versionLabel(step.before)} -> ${versionLabel(step.after)}</h2>
        <p>${formatVersionDate(step.before.createdAt)} -> ${formatVersionDate(step.after.createdAt)}</p>
      </header>
      ${raw(renderPageChange(step))}
    </article>
  `;
}

function renderPageChange(step: ChangesSinceTopLevelNodeStep): string {
  if ("frames" in step.page) {
    return renderChangedPage(step.page.pageChanges, step.page.frames);
  }

  return renderWholePageChange(step.page.status, step.page.page.topFrames.length);
}

function renderWholePageChange(status: "added" | "removed", topFrameCount: number): string {
  return html`
    <p class="changes-step__whole changes-step__whole--${status}">
      ${status === "added" ? "Added" : "Removed"} page with ${topFrameCount} top-level frames.
    </p>
  `;
}

function renderChangedPage(
  pageChanges: FigmaDiffChange[],
  frames: FigmaDiffFrame[],
): string {
  return html`
    ${pageChanges.length === 0
      ? ""
      : raw(html`
        <section class="changes-step__section">
          <h3>Page properties</h3>
          ${pageChanges.map((change) => raw(renderChange(change)))}
        </section>
      `)}
    ${frames.length === 0
      ? ""
      : raw(html`
        <section class="changes-step__section">
          <h3>Child nodes</h3>
          ${frames.map((frame) => raw(renderFrame(frame)))}
        </section>
      `)}
  `;
}

function renderFrame(frame: FigmaDiffFrame): string {
  if (frame.status === "changed") {
    return html`
      <details class="changes-frame">
        <summary>
          <strong>~ ${frame.beforeName === frame.name ? frame.name : `${frame.beforeName} -> ${frame.name}`}</strong>
          <small>${frame.id}</small>
        </summary>
        <div class="changes-frame__changes">
          ${frame.changes.map((change) => raw(renderChange(change)))}
        </div>
      </details>
    `;
  }

  return html`
    <details class="changes-frame">
      <summary>
        <strong>${frame.status === "added" ? "+" : "-"} ${frame.frame.name}</strong>
        <small>${frame.frame.type} · ${frame.frame.id}</small>
      </summary>
    </details>
  `;
}

function renderChange(change: FigmaDiffChange): string {
  return html`
    <dl class="changes-change">
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

function versionLabel(version: { id: string; label?: string | null }): string {
  return version.label === undefined || version.label === null || version.label === ""
    ? version.id
    : version.label;
}

function formatVersionDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatValue(value: FigmaDiffValue): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}
