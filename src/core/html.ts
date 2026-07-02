type RawHtml = {
  html: string;
};

export type HtmlValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | RawHtml
  | HtmlValue[];

export function html(strings: TemplateStringsArray, ...values: HtmlValue[]): string {
  let result = strings[0] ?? "";

  for (let index = 0; index < values.length; index += 1) {
    result += renderValue(values[index]) + (strings[index + 1] ?? "");
  }

  return result;
}

export function raw(value: string): RawHtml {
  return { html: value };
}

function renderValue(value: HtmlValue): string {
  if (Array.isArray(value)) {
    return value.map(renderValue).join("");
  }

  if (isRawHtml(value)) {
    return value.html;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return Bun.escapeHTML(value);
}

function isRawHtml(value: HtmlValue): value is RawHtml {
  return typeof value === "object" && value !== null && "html" in value;
}
