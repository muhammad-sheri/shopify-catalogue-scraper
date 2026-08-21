"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Choice = "light" | "dark" | "system";

const ORDER: Choice[] = ["system", "light", "dark"];
const ICONS = { system: Monitor, light: Sun, dark: Moon };
const EVENT = "themechange";

/*
 * The theme lives on <html data-theme>, written by the inline script in
 * layout.tsx before first paint. That makes it external state, so it is read
 * with useSyncExternalStore rather than copied into an effect: the server
 * renders "system", the client re-reads the real value during hydration, and
 * there is neither a mismatch warning nor a cascading render.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function readTheme(): Choice {
  const attribute = document.documentElement.getAttribute("data-theme");
  return attribute === "dark" || attribute === "light" ? attribute : "system";
}

const readServerTheme = (): Choice => "system";

/** Cycles system → light → dark. "System" is a real state: follow the OS. */
export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, readTheme, readServerTheme);

  const apply = (next: Choice) => {
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // Private windows and blocked site data both throw; losing the
      // preference on reload beats breaking the toggle.
    }
    window.dispatchEvent(new Event(EVENT));
  };

  const Icon = ICONS[choice];

  return (
    <button
      onClick={() => apply(ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length])}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium capitalize transition-colors hover:brightness-125"
      style={{
        background: "var(--hero-chip)",
        border: "1px solid var(--hero-edge)",
        color: "var(--hero-text)",
      }}
      title={`Theme: ${choice}. Click to change.`}
    >
      <Icon size={14} aria-hidden />
      <span className="hidden sm:inline">{choice}</span>
    </button>
  );
}
