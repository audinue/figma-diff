import { html, raw } from "./html";

export type LayoutViewOptions = {
  title: string;
  body: string;
};

export function renderLayoutView(options: LayoutViewOptions): string {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${options.title}</title>
        <style>
          ${raw(styles)}
        </style>
      </head>
      <body>
        ${raw(options.body)}
      </body>
    </html>`;
}

const styles = `
:root {
  color-scheme: light;
  --paper: #f7f5ef;
  --ink: #202020;
  --muted: #67645d;
  --line: #d9d2c3;
  --panel: #fffdf8;
  --panel-strong: #f0eadc;
  --accent: #0b6b63;
  --visited: #6b4c9a;
  --added: #0f7b48;
  --removed: #aa3b2b;
  --changed: #9a6600;
  --code: #263029;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    linear-gradient(90deg, rgba(32, 32, 32, 0.045) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(rgba(32, 32, 32, 0.035) 1px, transparent 1px) 0 0 / 24px 24px,
    var(--paper);
  color: var(--ink);
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
  line-height: 1.45;
}

a {
  color: var(--accent);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

main {
  width: min(1180px, calc(100vw - 40px));
  margin: 0 auto;
  padding: 32px 0 56px;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

.version-list__header,
.diff-result__header {
  border-bottom: 2px solid var(--ink);
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
  padding-bottom: 18px;
}

.version-list__header h1,
.diff-result__header h1 {
  font-size: clamp(34px, 5vw, 72px);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 0.95;
  margin: 0;
}

.version-list__header p,
.diff-result__header p {
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  margin: 0;
}

.version-list__items {
  display: grid;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.version-list__item {
  background: var(--panel);
  border: 1px solid var(--line);
  border-left: 6px solid var(--accent);
}

.version-list__item a,
.version-list__item--disabled {
  color: inherit;
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  text-decoration: none;
}

.version-list__item a:visited,
.version-list__item a:visited .version-list__title {
  color: var(--visited);
}

.version-list__item:hover {
  border-color: var(--ink);
}

.version-list__item--disabled {
  border-left-color: var(--muted);
  opacity: 0.72;
}

.version-list__title {
  font-size: 18px;
  font-weight: 800;
}

.version-list__details,
.version-list__meta,
.version-list__user,
.version-list__description {
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  gap: 10px;
}

.version-list__user {
  align-items: center;
  gap: 7px;
}

.version-list__user-initial {
  align-items: center;
  background: var(--panel-strong);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink);
  display: inline-flex;
  font-size: 11px;
  font-weight: 800;
  height: 20px;
  justify-content: center;
  width: 20px;
}

.diff-result__summary {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin-bottom: 18px;
}

.diff-result__summary-item,
.diff-result__files > div,
.diff-page,
.diff-frame {
  background: var(--panel);
  border: 1px solid var(--line);
}

.diff-result__summary-item {
  display: grid;
  gap: 6px;
  padding: 12px;
}

.diff-result__summary-item span {
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
}

.diff-result__summary-item strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 28px;
}

.diff-result__files {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 18px;
}

.diff-result__files > div {
  padding: 14px;
}

.diff-result__files h2 {
  font-size: 12px;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.diff-result__files p {
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  margin-bottom: 4px;
}

.diff-result__pages,
.diff-page__frames {
  display: grid;
  gap: 12px;
}

.diff-page {
  border-left: 6px solid var(--changed);
  padding: 16px;
}

.diff-page--added,
.diff-frame--added {
  border-left-color: var(--added);
}

.diff-page--removed,
.diff-frame--removed {
  border-left-color: var(--removed);
}

.diff-page--unchanged {
  border-left-color: var(--muted);
}

.diff-page h2 {
  font-size: 22px;
  margin-bottom: 4px;
}

.diff-page > p,
.diff-frame > p {
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  margin-bottom: 10px;
}

.diff-page__links,
.diff-frame__links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.diff-frame {
  border-left: 4px solid var(--changed);
  padding: 12px;
}

.diff-frame h3 {
  font-size: 17px;
  margin-bottom: 4px;
}

.diff-changes {
  display: grid;
  gap: 8px;
  margin: 12px 0;
}

.diff-change {
  background: var(--panel-strong);
  display: grid;
  gap: 8px;
  grid-template-columns: 150px minmax(0, 1fr) minmax(0, 1fr);
  margin: 0;
  padding: 10px;
}

.diff-change dt {
  font-weight: 800;
}

.diff-change dd {
  margin: 0;
  min-width: 0;
}

.diff-change dd span {
  color: var(--muted);
  display: block;
  font-size: 12px;
  margin-bottom: 4px;
  text-transform: uppercase;
}

code {
  color: var(--code);
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@media (max-width: 860px) {
  main {
    width: min(100vw - 24px, 1180px);
    padding-top: 20px;
  }

  .diff-result__summary,
  .diff-result__files,
  .diff-change {
    grid-template-columns: 1fr;
  }
}
`;
