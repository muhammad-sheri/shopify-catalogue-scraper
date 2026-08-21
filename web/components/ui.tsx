"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* Small, shared primitives. Hand-built rather than pulled from a component
   library so the app carries its own look instead of a recognisable default. */

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[--radius-card] border border-edge bg-surface shadow-card ${className}`}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      {children}
    </section>
  );
}

export function PanelHead({
  icon,
  title,
  chips = [],
  action,
}: {
  icon: ReactNode;
  title: string;
  chips?: string[];
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-edge-soft px-4 py-3 sm:px-5">
      <span
        className="grid size-7 shrink-0 place-items-center rounded-lg text-[13px] font-semibold"
        style={{ background: "var(--tint-hi)", color: "var(--primary)" }}
        aria-hidden
      >
        {icon}
      </span>
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <Chip key={chip}>{chip}</Chip>
        ))}
      </div>
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

export function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" }) {
  const styles =
    tone === "primary"
      ? { background: "var(--tint-hi)", color: "var(--primary)" }
      : { background: "var(--surface-2)", color: "var(--muted)" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
      style={styles}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "ghost",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2";
  const look =
    variant === "primary"
      ? "text-[color:var(--on-primary)] hover:brightness-110"
      : "border border-edge text-ink hover:bg-[color:var(--tint)]";
  return (
    <button
      className={`${base} ${look} ${className}`}
      style={{
        ...(variant === "primary" ? { background: "var(--primary)" } : undefined),
        outlineColor: "var(--primary)",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-muted/70 focus:outline-2 focus:outline-offset-0 focus:outline-[color:var(--primary)]";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-edge p-0.5"
      style={{ background: "var(--surface-2)" }}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className="rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-colors"
            style={
              active
                ? { background: "var(--surface)", color: "var(--primary)", boxShadow: "var(--shadow)" }
                : { color: "var(--muted)" }
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 text-[13px] font-medium"
    >
      <span
        className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "var(--primary)" : "var(--border)" }}
      >
        <span
          className="absolute top-0.5 size-4 rounded-full bg-white transition-[left] duration-150"
          style={{ left: checked ? "1.125rem" : "0.125rem" }}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}

/** Multi-select facet. Pills while they fit, a scrolling list once they do not. */
export function Pills({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (option: string) =>
    onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]);

  return (
    <div className={`flex flex-wrap gap-1.5 ${options.length > 8 ? "max-h-24 overflow-y-auto" : ""}`}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            aria-pressed={active}
            onClick={() => toggle(option)}
            className="rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors"
            style={
              active
                ? { borderColor: "var(--primary)", background: "var(--tint-hi)", color: "var(--primary)" }
                : { borderColor: "var(--border)", color: "var(--muted)" }
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function Popover({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <Button onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {trigger}
      </Button>
      {open ? (
        <div
          className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-edge bg-surface p-3 shadow-float"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
