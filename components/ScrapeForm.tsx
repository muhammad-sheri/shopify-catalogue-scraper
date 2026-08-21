"use client";

import { Loader2, Store, Zap } from "lucide-react";
import { useState } from "react";
import { Button, Field, Panel, PanelHead, Toggle, inputClass } from "./ui";

/** Stores verified to serve /products.json, so a first click always works. */
const EXAMPLES = [
  { label: "Allbirds", url: "https://www.allbirds.com" },
  { label: "Death Wish Coffee", url: "https://www.deathwishcoffee.com/collections/all" },
  { label: "Olipop", url: "https://drinkolipop.com/collections/all" },
  { label: "ColourPop", url: "https://colourpop.com" },
];

export function ScrapeForm({
  busy,
  onRun,
  onCancel,
}: {
  busy: boolean;
  onRun: (url: string, maxProducts: number | null) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("https://www.allbirds.com");
  const [wholeCatalogue, setWholeCatalogue] = useState(true);
  const [limit, setLimit] = useState(50);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (url.trim() && !busy) onRun(url, wholeCatalogue ? null : limit);
  };

  return (
    <Panel>
      <PanelHead icon={<Store size={15} />} title="Which store?" chips={["Any Shopify storefront"]} />
      <form onSubmit={submit} className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Field label="Store URL" hint="A collection URL works too, and scrapes just that collection.">
              <input
                className={inputClass}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://www.allbirds.com"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
              />
            </Field>
          </div>
          {busy ? (
            <Button type="button" onClick={onCancel} className="h-[42px] sm:w-32">
              Cancel
            </Button>
          ) : (
            <Button type="submit" variant="primary" className="h-[42px] sm:w-32" disabled={!url.trim()}>
              <Zap size={15} aria-hidden />
              Scrape
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Toggle checked={wholeCatalogue} onChange={setWholeCatalogue} label="Fetch the entire catalogue" />
          {!wholeCatalogue ? (
            <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-muted">
              <span>Stop after</span>
              {/* step must stay 1: with min=1 a step of 10 makes 50 and 100
                  invalid values, which silently blocks form submission. */}
              <input
                type="number"
                min={1}
                max={5000}
                step={1}
                value={limit}
                onChange={(event) => setLimit(Math.max(1, Number(event.target.value) || 1))}
                className={`${inputClass} tnum w-24 py-1.5`}
              />
              <span>products</span>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-edge-soft pt-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Try</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.url}
              type="button"
              onClick={() => setUrl(example.url)}
              disabled={busy}
              className="rounded-full border border-edge px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:border-[color:var(--primary)] hover:text-[color:var(--primary)] disabled:opacity-50"
            >
              {example.label}
            </button>
          ))}
        </div>

        <p className="text-[12.5px] leading-relaxed text-muted">
          One row per variant. Each size or colour has its own SKU, price and stock flag, so a
          catalogue of 300 products is usually a few thousand rows.
        </p>
      </form>
    </Panel>
  );
}

export function BusySpinner() {
  return <Loader2 size={15} className="animate-spin" aria-hidden />;
}
