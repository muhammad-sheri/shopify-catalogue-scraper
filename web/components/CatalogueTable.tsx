"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, Columns3, ExternalLink, Table2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { groupProducts, priceLabel, toPrice, variantsOf } from "@/lib/catalogue";
import { columnsFor } from "@/lib/export";
import type { ProductGroup, Row } from "@/lib/types";
import { Chip, Panel, PanelHead, Popover, Segmented } from "./ui";

const GROUPED = "Grouped by product";
const FLAT = "Every variant";
const VIEWS = [GROUPED, FLAT] as const;

/** Every column that reaches a table gets a human label. */
const LABELS: Record<string, string> = {
  product_id: "Product ID",
  variant_id: "Variant ID",
  url: "Product page",
  image: "Photo",
  variant_title: "Variant",
  product_type: "Type",
  compare_at_price: "Was",
  discount_pct: "Off",
  available: "In stock",
  image_count: "Images",
  grams: "Weight (g)",
  sku: "SKU",
  option1: "Option 1",
  option2: "Option 2",
  option3: "Option 3",
  published_at: "Published",
  created_at: "Created",
  updated_at: "Updated",
  variant_updated_at: "Variant updated",
  requires_shipping: "Ships",
};

const DEFAULT_COLUMNS = [
  "image", "title", "url", "vendor", "product_type", "variant_title", "sku",
  "price", "compare_at_price", "discount_pct", "available", "tags",
];

const NUMERIC = new Set([
  "price", "compare_at_price", "discount_pct", "grams", "image_count",
  "position", "product_id", "variant_id",
]);

const label = (name: string) =>
  LABELS[name] ?? name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ");

/* Product images come straight from Shopify's CDN. Deliberately plain <img>
   rather than next/image: a catalogue view can hold thousands of thumbnails,
   and routing every one through the image optimiser would be slow and would
   burn the account's optimisation quota for no visible gain at this size. */
function Thumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return <div className="size-10 shrink-0 rounded-md" style={{ background: "var(--surface-2)" }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="size-10 shrink-0 rounded-md object-cover"
      style={{ background: "var(--surface-2)" }}
    />
  );
}

function StockBadge({ text }: { text: string }) {
  const tone =
    text === "In stock"
      ? { background: "var(--green-bg)", color: "var(--green-text)" }
      : text === "Out of stock"
        ? { background: "var(--red-bg)", color: "var(--red-text)" }
        : { background: "var(--orange-bg)", color: "var(--orange-text)" };
  return (
    <span className="tnum inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={tone}>
      {text}
    </span>
  );
}

function cellText(row: Row, column: string, currency: string): string {
  const value = row[column];
  if (value === null || value === undefined || value === "") return "—";
  if (column === "price" || column === "compare_at_price") {
    const price = toPrice(value);
    return price === null ? "—" : priceLabel(price, price, currency);
  }
  if (column === "discount_pct") return `${value}%`;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function CatalogueTable({ rows, currency }: { rows: Row[]; currency: string }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>(GROUPED);
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);

  const available = useMemo(() => columnsFor(rows), [rows]);
  const shown = useMemo(() => columns.filter((c) => available.includes(c)), [columns, available]);

  return (
    <Panel>
      <PanelHead
        icon={<Table2 size={15} />}
        title="Results"
        chips={[view === GROUPED ? "One row per product" : "One row per variant"]}
        action={
          <div className="flex items-center gap-2">
            <Segmented label="View" options={VIEWS} value={view} onChange={setView} />
            {view === FLAT ? (
              <Popover
                trigger={
                  <>
                    <Columns3 size={14} aria-hidden />
                    <span className="hidden sm:inline">Columns</span>
                  </>
                }
              >
                <div className="max-h-72 overflow-y-auto">
                  <p className="mb-2 text-[11px] text-muted">
                    Every field the store&rsquo;s API publishes.
                  </p>
                  {available.map((column) => (
                    <label key={column} className="flex items-center gap-2 py-1 text-[13px]">
                      <input
                        type="checkbox"
                        checked={shown.includes(column)}
                        onChange={(event) =>
                          setColumns((prev) =>
                            event.target.checked
                              ? [...available.filter((c) => prev.includes(c) || c === column)]
                              : prev.filter((c) => c !== column),
                          )
                        }
                      />
                      {label(column)}
                    </label>
                  ))}
                </div>
              </Popover>
            ) : null}
          </div>
        }
      />
      {view === GROUPED ? (
        <GroupedView rows={rows} currency={currency} />
      ) : (
        <FlatView rows={rows} columns={shown} currency={currency} />
      )}
    </Panel>
  );
}

function GroupedView({ rows, currency }: { rows: Row[]; currency: string }) {
  // useVirtualizer returns fresh closures each render; the React Compiler
  // cannot memoize them safely, so this component opts out of compilation.
  "use no memo";
  const groups = useMemo(() => groupProducts(rows), [rows]);
  const [open, setOpen] = useState<Set<string | number>>(new Set());
  const scroller = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 64,
    overscan: 8,
    // Expanded rows are taller than the estimate, so real heights are measured
    // rather than guessed; without this the scrollbar drifts as rows open.
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  const toggle = (id: string | number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div ref={scroller} className="max-h-[68vh] overflow-y-auto">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const group = groups[item.index];
          const id = (group.product_id || group.url || group.title || "") as string | number;
          const expanded = open.has(id);
          return (
            <div
              key={id}
              ref={virtualizer.measureElement}
              data-index={item.index}
              className="absolute left-0 top-0 w-full border-b border-edge-soft"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <GroupedRow
                group={group}
                currency={currency}
                expanded={expanded}
                onToggle={() => toggle(id)}
              />
              {expanded ? <VariantList rows={variantsOf(rows, id)} currency={currency} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupedRow({
  group,
  currency,
  expanded,
  onToggle,
}: {
  group: ProductGroup;
  currency: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[color:var(--tint)] sm:px-5"
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <ChevronRight
        size={15}
        aria-hidden
        className="shrink-0 text-muted transition-transform"
        style={{ transform: expanded ? "rotate(90deg)" : undefined }}
      />
      <Thumb src={group.image} alt={group.title ?? ""} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">{group.title ?? "Untitled"}</div>
        <div className="truncate text-[11.5px] text-muted">
          {[group.vendor, group.product_type].filter(Boolean).join(", ") || "—"}
        </div>
      </div>
      <div className="hidden w-24 shrink-0 sm:block">
        <Chip>{group.variants} {group.variants === 1 ? "variant" : "variants"}</Chip>
      </div>
      <div className="w-24 shrink-0 text-right sm:w-28">
        <StockBadge text={group.stock} />
      </div>
      <div className="tnum w-28 shrink-0 text-right text-[13px] font-semibold sm:w-40">
        {priceLabel(group.price_min, group.price_max, currency)}
      </div>
      <div className="tnum hidden w-16 shrink-0 text-right text-[12px] font-semibold sm:block" style={{ color: "var(--orange)" }}>
        {group.best_discount_pct ? `-${group.best_discount_pct}%` : ""}
      </div>
      {group.url ? (
        <a
          href={group.url}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="shrink-0 text-muted hover:text-[color:var(--primary)]"
          title="Open product page"
        >
          <ExternalLink size={14} />
        </a>
      ) : null}
    </div>
  );
}

function VariantList({ rows, currency }: { rows: Row[]; currency: string }) {
  return (
    <div className="scroll-x px-4 pb-3 sm:px-5" style={{ background: "var(--surface-2)" }}>
      <table className="w-full min-w-[34rem] text-[12.5px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="py-2 pr-3 font-semibold">Variant</th>
            <th className="py-2 pr-3 font-semibold">SKU</th>
            <th className="py-2 pr-3 text-right font-semibold">Price</th>
            <th className="py-2 pr-3 text-right font-semibold">Was</th>
            <th className="py-2 text-right font-semibold">Stock</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.variant_id ?? index}`} className="border-t border-edge-soft">
              <td className="py-1.5 pr-3">{row.variant_title ?? "—"}</td>
              <td className="tnum py-1.5 pr-3 font-mono text-[11.5px] text-muted">{row.sku || "—"}</td>
              <td className="tnum py-1.5 pr-3 text-right font-semibold">
                {cellText(row, "price", currency)}
              </td>
              <td className="tnum py-1.5 pr-3 text-right text-muted line-through">
                {row.compare_at_price ? cellText(row, "compare_at_price", currency) : ""}
              </td>
              <td className="py-1.5 text-right">
                <StockBadge text={row.available === true ? "In stock" : row.available === false ? "Out of stock" : "Unknown"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlatView({ rows, columns, currency }: { rows: Row[]; columns: string[]; currency: string }) {
  // useVirtualizer returns fresh closures each render; the React Compiler
  // cannot memoize them safely, so this component opts out of compilation.
  "use no memo";
  const scroller = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const width = (column: string) =>
    column === "image" ? 76 : column === "title" ? 260 : column === "url" ? 220 : NUMERIC.has(column) ? 110 : 150;
  const total = columns.reduce((sum, column) => sum + width(column), 0);

  return (
    <div ref={scroller} className="scroll-x max-h-[68vh] overflow-y-auto">
      <div style={{ minWidth: total }}>
        <div
          className="sticky top-0 z-10 flex border-b border-edge text-[11px] uppercase tracking-wider text-muted"
          style={{ background: "var(--surface-2)" }}
        >
          {columns.map((column) => (
            <div
              key={column}
              className={`shrink-0 truncate px-3 py-2.5 font-semibold ${NUMERIC.has(column) ? "text-right" : ""}`}
              style={{ width: width(column) }}
            >
              {label(column)}
            </div>
          ))}
        </div>
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index];
            return (
              <div
                key={item.key}
                className="absolute left-0 top-0 flex items-center border-b border-edge-soft text-[12.5px]"
                style={{ height: item.size, transform: `translateY(${item.start}px)`, minWidth: total }}
              >
                {columns.map((column) => (
                  <div
                    key={column}
                    className={`shrink-0 truncate px-3 ${NUMERIC.has(column) ? "tnum text-right" : ""}`}
                    style={{ width: width(column) }}
                    title={column === "image" ? undefined : cellText(row, column, currency)}
                  >
                    {column === "image" ? (
                      <Thumb src={(row.image as string) ?? null} alt={String(row.title ?? "")} />
                    ) : column === "url" && row.url ? (
                      <a
                        href={String(row.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[color:var(--primary)] hover:underline"
                      >
                        {String(row.url).replace(/^https?:\/\/[^/]+/, "")}
                      </a>
                    ) : column === "available" ? (
                      <StockBadge text={row.available === true ? "In stock" : row.available === false ? "Out" : "?"} />
                    ) : (
                      cellText(row, column, currency)
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
