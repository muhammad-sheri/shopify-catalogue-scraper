import { ThemeToggle } from "./ThemeToggle";

const GITHUB_URL = "https://github.com/muhammad-sheri/web-scraping-ai-agent";

/*
 * Fine film grain over the slab. Flat black renders as a dead, cheap-looking
 * field on most panels; a touch of noise gives it a surface. Generated in the
 * SVG filter rather than shipped as an image so it costs no request and stays
 * crisp at any density.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const FEATURES = ["Exact store data", "Every size & colour", "Filter, group, export"];

/*
 * An illustration of the output, not real data — it balances the headline
 * column and shows the shape of a result in the same breath. Marked aria-hidden
 * because it says nothing a screen reader needs; the prose above already does.
 */
const PREVIEW_ROWS = [
  { sku: "TR-M-NVY-09", price: "$98.00", stocked: true },
  { sku: "TR-M-NVY-10", price: "$98.00", stocked: true },
  { sku: "TR-W-GRY-07", price: "$98.00", stocked: false },
  { sku: "LN-M-BLK-11", price: "$110.00", stocked: true },
  { sku: "WL-W-RSE-08", price: "$135.00", stocked: true },
];

function OutputPreview() {
  return (
    <div
      aria-hidden
      className="w-full max-w-[26rem] overflow-hidden rounded-xl backdrop-blur-sm"
      style={{
        background: "var(--hero-panel)",
        border: "1px solid var(--hero-panel-edge)",
        boxShadow: "0 24px 60px -30px rgba(0,0,0,.9)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2.5"
        style={{ borderBottom: "1px solid var(--hero-panel-edge)" }}
      >
        <span className="flex gap-1.5" aria-hidden>
          {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
            <span key={dot} className="size-2 rounded-full opacity-70" style={{ background: dot }} />
          ))}
        </span>
        <span className="ml-1 font-mono text-[11px]" style={{ color: "var(--hero-muted)" }}>
          allbirds.com<span className="opacity-55">/products.json</span>
        </span>
      </div>

      <div className="px-3.5 py-3 font-mono text-[11.5px]">
        <div
          className="flex items-center justify-between pb-2 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--hero-muted)", opacity: 0.7 }}
        >
          <span>Variant SKU</span>
          <span>Price</span>
        </div>
        <div className="flex flex-col gap-[7px]">
          {PREVIEW_ROWS.map((row) => (
            <div key={row.sku} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 truncate" style={{ color: "var(--hero-text)" }}>
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: row.stocked ? "var(--hero-dot)" : "var(--hero-muted)",
                    opacity: row.stocked ? 1 : 0.45,
                  }}
                />
                {row.sku}
              </span>
              <span className="tnum shrink-0" style={{ color: "var(--hero-muted)" }}>
                {row.price}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="px-3.5 py-2.5 font-mono text-[10.5px]"
        style={{ borderTop: "1px solid var(--hero-panel-edge)", color: "var(--hero-muted)" }}
      >
        <span className="tnum" style={{ color: "var(--hero-text)" }}>2,481</span> variant rows from{" "}
        <span className="tnum">412</span> products
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <header
      className="relative isolate overflow-hidden pt-6 pb-28 sm:pb-32"
      style={{
        background: "linear-gradient(168deg, var(--hero-from) 0%, var(--hero-to) 100%)",
        color: "var(--hero-text)",
      }}
    >
      {/* One directed light behind the headline rather than two competing
          blooms, so the slab reads as lit from a point instead of smudged. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-[8%] size-[38rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--hero-glow-a), transparent 68%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/3 size-[30rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--hero-glow-b), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
      {/* Hairline catching the light along the very top edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--hero-panel-edge) 30%, transparent 80%)" }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex items-center justify-end gap-4">
          <ThemeToggle />
        </div>

        <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="min-w-0">
            <h1 className="text-[2.5rem] font-bold leading-[0.98] tracking-[-0.035em] sm:text-[3.25rem] lg:text-[3.5rem]">
              Shopify Catalogue
              <br />
              Scraper
            </h1>
            <p
              className="mt-5 max-w-lg text-[15px] leading-relaxed sm:text-[16.5px]"
              style={{ color: "var(--hero-muted)" }}
            >
              Point it at any Shopify store and get the whole catalogue as structured rows, one per
              variant, carrying the store&rsquo;s own SKUs, prices and stock flags.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {FEATURES.map((label) => (
                <span
                  key={label}
                  className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                  style={{
                    background: "var(--hero-chip)",
                    border: "1px solid var(--hero-edge)",
                    color: "var(--hero-text)",
                  }}
                >
                  {label}
                </span>
              ))}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors"
                style={{
                  background: "var(--hero-chip-hi)",
                  border: "1px solid var(--hero-edge)",
                  color: "var(--hero-text)",
                }}
              >
                View source
                <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
                  ↗
                </span>
              </a>
            </div>
          </div>

          <div className="hidden justify-self-end lg:block">
            <OutputPreview />
          </div>
        </div>
      </div>
    </header>
  );
}
