/**
 * CSV and JSON export, built in the browser from the rows already on screen.
 *
 * Exports what the filters left visible, not the whole catalogue: the table
 * and the download should never disagree about what "the results" are.
 */

import type { Row } from "./types";

/** Union of keys across rows, in first-seen order. Mirrors output.columns_for. */
export function columnsFor(rows: Row[]): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Quote when the value could otherwise break the row apart. The doubled
  // quote is RFC 4180's escape, and it is what spreadsheets expect.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Row[], columns: string[] = columnsFor(rows)): string {
  const head = columns.map(cell).join(",");
  const body = rows.map((row) => columns.map((column) => cell(row[column])).join(","));
  return [head, ...body].join("\r\n");
}

/** Turn a store URL into a filename stem: allbirds.com -> allbirds-com */
export function slug(url: string): string {
  return (
    url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "catalogue"
  );
}

export function download(contents: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers; one tick
  // is enough for the click to have been handed off.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
