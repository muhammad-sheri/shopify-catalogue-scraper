"use client";

import { AlertTriangle, Loader2, PackageSearch, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { filterRows } from "@/lib/catalogue";
import { NO_FILTERS, type Filters } from "@/lib/types";
import { useCatalogue } from "@/lib/useCatalogue";
import { CatalogueTable } from "./CatalogueTable";
import { Downloads } from "./Downloads";
import { FilterBar } from "./FilterBar";
import { ScrapeForm } from "./ScrapeForm";
import { StatTiles } from "./StatTiles";
import { Panel } from "./ui";

function Notice({
  tone,
  icon,
  title,
  children,
}: {
  tone: "red" | "orange" | "plain";
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  const colours =
    tone === "red"
      ? { background: "var(--red-bg)", color: "var(--red-text)", border: "var(--red)" }
      : tone === "orange"
        ? { background: "var(--orange-bg)", color: "var(--orange-text)", border: "var(--orange)" }
        : { background: "var(--surface-2)", color: "var(--muted)", border: "var(--border)" };

  return (
    <div
      className="flex items-start gap-3 rounded-[--radius-card] border p-4"
      style={{ background: colours.background, borderColor: colours.border, borderRadius: "var(--radius-card)" }}
    >
      <span className="mt-0.5 shrink-0" style={{ color: colours.color }} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold" style={{ color: colours.color }}>
          {title}
        </p>
        {children ? <div className="mt-1 text-[13px] leading-relaxed" style={{ color: colours.color }}>{children}</div> : null}
      </div>
    </div>
  );
}

export function Workspace() {
  const catalogue = useCatalogue();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const currency = catalogue.store?.meta.currency ?? "";
  const busy = catalogue.phase === "checking" || catalogue.phase === "fetching";

  const visible = useMemo(() => filterRows(catalogue.rows, filters), [catalogue.rows, filters]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 sm:px-8">
      <ScrapeForm
        busy={busy}
        onRun={(url, max) => {
          setFilters(NO_FILTERS); // a new store deserves a clean filter bar
          catalogue.run(url, max);
        }}
        onCancel={catalogue.cancel}
      />

      {catalogue.phase === "checking" ? (
        <Notice tone="plain" icon={<Loader2 size={17} className="animate-spin" />} title="Checking the store…">
          Asking whether this is a Shopify storefront and whether its product API will answer.
        </Notice>
      ) : null}

      {catalogue.phase === "fetching" ? (
        <Notice
          tone="plain"
          icon={<Loader2 size={17} className="animate-spin" />}
          title={`Fetching page ${catalogue.progress.page || 1}…`}
        >
          <span className="tnum">
            {catalogue.progress.products.toLocaleString("en-US")} products ·{" "}
            {catalogue.progress.rows.toLocaleString("en-US")} variant rows so far
          </span>
        </Notice>
      ) : null}

      {catalogue.phase === "error" ? (
        <Notice
          tone={catalogue.refused ? "orange" : "red"}
          icon={<AlertTriangle size={17} />}
          title={
            catalogue.refused
              ? "Catalogue not readable"
              : catalogue.store
                ? "Not a Shopify store"
                : "That did not work"
          }
        >
          {catalogue.error}
          {catalogue.refused ? (
            <p className="mt-1 opacity-80">
              The storefront is Shopify, but it will not serve its product API to us. Nothing here
              can change that; try another store.
            </p>
          ) : null}
        </Notice>
      ) : null}

      {catalogue.rows.length > 0 ? (
        <>
          <StatTiles visible={visible} total={catalogue.rows} currency={currency} />

          {catalogue.capped ? (
            <Notice tone="plain" icon={<PackageSearch size={16} />} title="Stopped at your product limit">
              Turn on &ldquo;Fetch the entire catalogue&rdquo; to pull the rest.
            </Notice>
          ) : null}
          {catalogue.descriptionsTrimmed ? (
            <Notice tone="plain" icon={<PackageSearch size={16} />} title="Descriptions were dropped">
              This catalogue is large enough that keeping product descriptions would have exceeded
              the response size limit. Every other field is intact.
            </Notice>
          ) : null}

          <FilterBar rows={catalogue.rows} filters={filters} onChange={setFilters} currency={currency} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12.5px] text-muted">
              {catalogue.store?.meta.name ? (
                <>
                  <span className="font-semibold text-ink">{catalogue.store.meta.name}</span> ·{" "}
                </>
              ) : null}
              {catalogue.store?.url}
            </p>
            <Downloads rows={visible} storeUrl={catalogue.store?.url ?? ""} />
          </div>

          {visible.length === 0 ? (
            <Panel>
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <SearchX size={28} className="text-muted" aria-hidden />
                <p className="text-[15px] font-semibold">Nothing matches these filters</p>
                <p className="max-w-md text-[13px] text-muted">
                  Widen the price range, clear the search, or set availability back to Any.
                </p>
              </div>
            </Panel>
          ) : (
            <CatalogueTable rows={visible} currency={currency} />
          )}
        </>
      ) : null}
    </div>
  );
}
