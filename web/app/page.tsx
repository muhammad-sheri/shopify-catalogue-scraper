import { Hero } from "@/components/Hero";
import { Workspace } from "@/components/Workspace";

export default function Home() {
  return (
    <main>
      <Hero />
      <Workspace />
      {/* The rule sits inside the padding so it starts where the card does,
          rather than 32px wider on each side. */}
      <footer className="mx-auto mt-6 max-w-6xl px-5 pb-12 text-[12px] text-muted sm:px-8">
        <p className="border-t border-edge pt-6">
          Reads each store&rsquo;s public product API — the same endpoint the storefront&rsquo;s own
          JavaScript uses. No model, no API key, nothing billed.
        </p>
      </footer>
    </main>
  );
}
