import { Hero } from "@/components/Hero";
import { Workspace } from "@/components/Workspace";

export default function Home() {
  return (
    <main>
      <Hero />
      <Workspace />
      <footer className="mx-auto max-w-6xl px-5 pb-10 text-[12px] text-muted sm:px-8">
        Reads each store&rsquo;s public product API — the same endpoint the storefront&rsquo;s own
        JavaScript uses. No model, no API key, nothing billed.
      </footer>
    </main>
  );
}
