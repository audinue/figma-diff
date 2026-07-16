import type { GetFileVersionsResponse } from "./figma-api";
import { html, raw } from "./html";

export type VersionListViewOptions = {
  title?: string;
  diffPath?: string;
  changesSincePath?: string;
};

export function renderVersionListView(
  versionsResponse: GetFileVersionsResponse,
  options: VersionListViewOptions = {},
): string {
  const title = options.title ?? "Figma Versions";
  const diffPath = options.diffPath ?? "/diff";
  const changesSincePath = options.changesSincePath ?? "/changes-since";
  const versions = versionsResponse.versions;

  return html`
    <main class="version-list">
      <header class="version-list__header">
        <div>
          <h1>${title}</h1>
          <p>${versions.length} versions</p>
        </div>
        <form action="/clear-versions" method="post">
          <button type="submit">Clear versions</button>
        </form>
      </header>
      <ol class="version-list__items">
        ${versions.map((version) =>
          raw(renderVersionItem(version, diffPath, changesSincePath)),
        )}
      </ol>
    </main>
  `;
}

type Version = GetFileVersionsResponse["versions"][number];

function renderVersionItem(
  version: Version,
  diffPath: string,
  changesSincePath: string,
): string {
  const label = version.label ?? version.id;
  const description = version.description ?? "";
  const user = version.user.handle;
  const href = `${diffPath}?version=${encodeURIComponent(version.id)}`;
  const changesSinceHref = `${changesSincePath}?version=${encodeURIComponent(version.id)}`;
  return html`
    <li class="version-list__item">
      <div class="version-list__content">
        ${raw(renderVersionBody(label, version.created_at, user, description))}
        <span class="version-list__actions">
          <a href="${href}">Compare with current</a>
          <a href="${changesSinceHref}">Changes since this version</a>
        </span>
      </div>
    </li>
  `;
}

function renderVersionBody(
  label: string,
  createdAt: string,
  user: string,
  description: string,
): string {
  const formattedCreatedAt = formatVersionDate(createdAt);
  const userInitial = user.trim().charAt(0).toUpperCase();

  return html`
    <span class="version-list__title">${label}</span>
    <span class="version-list__details">
      <time datetime="${createdAt}">${formattedCreatedAt}</time>
    </span>
    <span class="version-list__user">
      <span class="version-list__user-initial">${userInitial}</span>
      <span>${user}</span>
    </span>
    ${description === ""
      ? ""
      : raw(html`<span class="version-list__description">${description}</span>`)}
  `;
}

function formatVersionDate(value: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("month")} ${part("day")}, ${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
}
