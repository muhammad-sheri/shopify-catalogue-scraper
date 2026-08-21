"use client";

import { Download } from "lucide-react";
import { columnsFor, download, slug, toCsv } from "@/lib/export";
import type { Row } from "@/lib/types";
import { Button } from "./ui";

/** Exports what the filters left visible, so table and file always agree. */
export function Downloads({ rows, storeUrl }: { rows: Row[]; storeUrl: string }) {
  const stem = `${slug(storeUrl)}-catalogue`;
  const disabled = rows.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] text-muted">
        {rows.length.toLocaleString("en-US")} row{rows.length === 1 ? "" : "s"} ready
      </span>
      <Button
        disabled={disabled}
        onClick={() => download(toCsv(rows, columnsFor(rows)), `${stem}.csv`, "text/csv;charset=utf-8")}
      >
        <Download size={14} aria-hidden />
        CSV
      </Button>
      <Button
        disabled={disabled}
        onClick={() =>
          download(JSON.stringify(rows, null, 2), `${stem}.json`, "application/json;charset=utf-8")
        }
      >
        <Download size={14} aria-hidden />
        JSON
      </Button>
    </div>
  );
}
