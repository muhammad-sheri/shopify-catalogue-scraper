"use client";

import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { distinct, priceBounds, priceLabel } from "@/lib/catalogue";
import { NO_FILTERS, STOCK_CHOICES, type Filters, type Row, type StockChoice } from "@/lib/types";
import { RangeSlider } from "./RangeSlider";
import { Button, Field, Panel, PanelHead, Pills, Segmented, Toggle, inputClass } from "./ui";

/** Summarises what is currently narrowing the table, for the panel header. */
function activeChips(filters: Filters, bounds: [number, number], currency: string): string[] {
  const chips: string[] = [];
  if (filters.search) chips.push(`“${filters.search}”`);
  if (filters.stock !== "Any") chips.push(filters.stock);
  if (filters.onSaleOnly) chips.push("Discounted");
  for (const chosen of [filters.vendors, filters.productTypes]) {
    if (chosen.length) {
      chips.push(chosen.slice(0, 2).join(", ") + (chosen.length > 2 ? ` +${chosen.length - 2}` : ""));
    }
  }
  // Only a range narrower than the whole catalogue is filtering anything.
  if (filters.priceRange && (filters.priceRange[0] > bounds[0] || filters.priceRange[1] < bounds[1])) {
    chips.push(priceLabel(filters.priceRange[0], filters.priceRange[1], currency));
  }
  return chips.length ? chips : ["No filters, showing everything"];
}

export function FilterBar({
  rows,
  filters,
  onChange,
  currency,
}: {
  rows: Row[];
  filters: Filters;
  onChange: (next: Filters) => void;
  currency: string;
}) {
  const bounds = useMemo(() => priceBounds(rows), [rows]);
  const vendors = useMemo(() => distinct(rows, "vendor"), [rows]);
  const types = useMemo(() => distinct(rows, "product_type"), [rows]);
  const hasRange = bounds[1] > bounds[0];

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const money = (value: number) => priceLabel(value, value, currency);

  return (
    <Panel>
      <PanelHead
        icon={<SlidersHorizontal size={15} />}
        title="Filters"
        chips={activeChips(filters, bounds, currency)}
        action={
          <Button onClick={() => onChange(NO_FILTERS)} title="Clear every filter">
            <RotateCcw size={14} aria-hidden />
            Reset
          </Button>
        }
      />

      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
        <Field label="Search" hint="All words must match, so “gold ring” finds rows containing both.">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              className={`${inputClass} pl-9`}
              value={filters.search}
              onChange={(event) => set("search", event.target.value)}
              placeholder="title, SKU, tag, colour…"
              type="search"
            />
          </div>
        </Field>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Field label="Availability">
            <Segmented
              label="Availability"
              options={STOCK_CHOICES}
              value={filters.stock}
              onChange={(next) => set("stock", next as StockChoice)}
            />
          </Field>
          <div className="pb-2">
            <Toggle
              checked={filters.onSaleOnly}
              onChange={(next) => set("onSaleOnly", next)}
              label="Discounted only"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          {hasRange ? (
            <Field label={currency ? `Price (${currency})` : "Price"}>
              <RangeSlider
                min={bounds[0]}
                max={bounds[1]}
                value={filters.priceRange ?? bounds}
                onChange={(next) =>
                  // Full width means "no price filter", so unpriced rows stay in.
                  set(
                    "priceRange",
                    next[0] <= bounds[0] && next[1] >= bounds[1] ? null : next,
                  )
                }
                format={money}
              />
            </Field>
          ) : (
            <Field label="Price">
              <div className="tnum text-[13px] text-muted">
                {priceLabel(bounds[0] || null, bounds[1] || null, currency)}
              </div>
            </Field>
          )}
        </div>

        {vendors.length > 1 ? (
          <Field label="Vendor">
            <Pills options={vendors} selected={filters.vendors} onChange={(next) => set("vendors", next)} />
          </Field>
        ) : null}
        {types.length > 1 ? (
          <Field label="Product type">
            <Pills
              options={types}
              selected={filters.productTypes}
              onChange={(next) => set("productTypes", next)}
            />
          </Field>
        ) : null}
      </div>
    </Panel>
  );
}
