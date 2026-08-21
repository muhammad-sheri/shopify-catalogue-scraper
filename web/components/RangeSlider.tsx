"use client";

/** Two-handle range control. Values are clamped so the handles cannot cross. */
export function RangeSlider({
  min,
  max,
  value,
  onChange,
  format,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
  format: (value: number) => string;
}) {
  const span = max - min || 1;
  const [low, high] = value;
  const leftPct = ((low - min) / span) * 100;
  const rightPct = ((high - min) / span) * 100;

  // A step of zero freezes the slider on stores whose prices span pennies, so
  // it scales with the range instead of being a fixed number.
  const step = span > 500 ? 1 : span > 50 ? 0.5 : 0.01;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-6 select-none">
        <div
          className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full"
          style={{ background: "var(--border)" }}
        />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ left: `${leftPct}%`, width: `${Math.max(rightPct - leftPct, 0)}%`, background: "var(--primary)" }}
        />
        <input
          type="range"
          className="range-input"
          aria-label="Minimum price"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(event) => onChange([Math.min(Number(event.target.value), high), high])}
        />
        <input
          type="range"
          className="range-input"
          aria-label="Maximum price"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(event) => onChange([low, Math.max(Number(event.target.value), low)])}
        />
      </div>
      <div className="tnum flex justify-between text-[11.5px] text-muted">
        <span>{format(low)}</span>
        <span>{format(high)}</span>
      </div>
    </div>
  );
}
