"use client";

import { priceBounds, priceLabel } from "@/lib/catalogue";
import type { Row } from "@/lib/types";

type Tone = "plain" | "primary" | "green" | "red" | "orange";

const TONES: Record<Tone, { value: string; label: string }> = {
  plain: { value: "var(--text)", label: "var(--muted)" },
  primary: { value: "var(--primary)", label: "var(--muted)" },
  green: { value: "var(--green)", label: "var(--muted)" },
  red: { value: "var(--red)", label: "var(--muted)" },
  orange: { value: "var(--orange)", label: "var(--muted)" },
};

function Tile({ label, value, sub, tone = "plain" }: { label: string; value: string; sub: string; tone?: Tone }) {
  const colours = TONES[tone];
  return (
    <div
      className="min-w-0 rounded-[--radius-card] border border-edge bg-surface px-4 py-3.5 shadow-card"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colours.label }}>
        {label}
      </div>
      <div
        className="tnum mt-1 truncate text-[1.6rem] font-bold leading-tight tracking-tight"
        style={{ color: colours.value }}
        title={value}
      >
        {value}
      </div>
      <div className="mt-0.5 truncate text-[12px] text-muted" title={sub}>
        {sub}
      </div>
    </div>
  );
}

/** Describes the filtered set, with the unfiltered total for context. */
export function StatTiles({
  visible,
  total,
  currency,
}: {
  visible: Row[];
  total: Row[];
  currency: string;
}) {
  const filtered = visible.length !== total.length;
  const products = new Set(visible.map((r) => r.product_id)).size;
  const allProducts = new Set(total.map((r) => r.product_id)).size;
  const inStock = visible.filter((r) => r.available === true).length;
  const [low, high] = priceBounds(visible);
  const share = visible.length
    ? `${Math.round((inStock / visible.length) * 100)}% of shown`
    : "nothing shown";
  const n = (value: number) => value.toLocaleString("en-US");

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Products"
        value={n(products)}
        sub={filtered ? `of ${n(allProducts)} in the store` : "in the catalogue"}
      />
      <Tile
        label="Variants"
        value={n(visible.length)}
        sub={filtered ? `of ${n(total.length)} rows` : "one row per size/colour"}
        tone="primary"
      />
      <Tile label="In stock" value={n(inStock)} sub={share} tone={inStock ? "green" : "red"} />
      <Tile
        label="Price range"
        value={priceLabel(low || null, high || null, currency)}
        sub={currency ? `in ${currency}` : "store currency unknown"}
        tone="orange"
      />
    </div>
  );
}
