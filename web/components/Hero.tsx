import { ThemeToggle } from "./ThemeToggle";

const GITHUB_URL = "https://github.com/muhammad-sheri/web-scraping-ai-agent";

export function Hero() {
  return (
    <header
      className="relative overflow-hidden px-5 pb-11 pt-6 sm:px-8 sm:pb-14"
      style={{
        background: "linear-gradient(135deg, var(--hero-from) 0%, var(--hero-to) 100%)",
        color: "var(--hero-text)",
      }}
    >
      {/* Two soft lights rather than a flat gradient, so the band has depth
          without needing an image the page would have to load. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-32 size-[26rem] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(139,139,245,.55), transparent 65%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-10 size-80 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(124,107,240,.45), transparent 65%)" }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide"
            style={{ background: "rgba(255,255,255,.12)", color: "var(--hero-text)" }}
          >
            <span className="size-1.5 rounded-full" style={{ background: "#4ade80" }} />
            No API key · $0 per run
          </span>
          <ThemeToggle />
        </div>

        <div className="max-w-3xl">
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[2.75rem]">
            Shopify Catalogue Scraper
          </h1>
          <p
            className="mt-3 max-w-2xl text-[15px] leading-relaxed sm:text-base"
            style={{ color: "var(--hero-muted)" }}
          >
            Point it at any Shopify store and get the whole catalogue as structured rows — one per
            variant, carrying the store&rsquo;s own SKUs, prices and stock flags. Read straight from
            the store&rsquo;s product API, so the numbers are exact rather than inferred.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["Exact store data", "Every size & colour", "Filter · group · export"].map((label) => (
            <span
              key={label}
              className="rounded-full px-3 py-1.5 text-[12px] font-medium"
              style={{ background: "rgba(255,255,255,.1)", color: "var(--hero-text)" }}
            >
              {label}
            </span>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-3 py-1.5 text-[12px] font-semibold underline-offset-4 hover:underline"
            style={{ background: "rgba(255,255,255,.16)", color: "var(--hero-text)" }}
          >
            View source ↗
          </a>
        </div>
      </div>
    </header>
  );
}
