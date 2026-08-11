"use client";

import { useId, useMemo, useState } from "react";

export interface StackBand {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface StackedAreaChartProps {
  categories: string[];
  categoryLabels: string[];
  /** Drawn bottom-to-top in array order — pass them in pipeline order. */
  bands: StackBand[];
  title: string;
  categoryLabel: string;
  /** "share" normalises every night to 100%, answering mix rather than volume. */
  mode?: "count" | "share";
  height?: number;
  compact?: boolean;
  /** For small multiples, where one legend serves the whole grid. */
  hideLegend?: boolean;
  emptyLabel?: string;
}

const WIDTH = 640;
const PAD_LEFT = 34;
const PAD_RIGHT = 12;
const PAD_TOP = 10;
const PAD_BOTTOM = 26;
const MIN_LABEL_GAP = 56;

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function StackedAreaChart({
  categories,
  categoryLabels,
  bands,
  title,
  categoryLabel,
  mode = "count",
  height = 220,
  compact = false,
  hideLegend = false,
  emptyLabel,
}: StackedAreaChartProps) {
  const titleId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const n = categories.length;
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;

  const totals = useMemo(
    () => categories.map((_, i) => bands.reduce((sum, b) => sum + (b.values[i] ?? 0), 0)),
    [categories, bands],
  );

  const maxValue = useMemo(
    () => (mode === "share" ? 1 : niceMax(Math.max(1, ...totals))),
    [mode, totals],
  );

  // Cumulative tops per band per point, so each band is drawn as the ribbon
  // between the running total below it and the running total including it.
  const stacked = useMemo(() => {
    const running = new Array(n).fill(0);
    return bands.map((band) => {
      const lower = [...running];
      for (let i = 0; i < n; i++) running[i] += band.values[i] ?? 0;
      return { band, lower, upper: [...running] };
    });
  }, [bands, n]);

  // In share mode a night with nobody there has no share to draw — plotting
  // it as 0% would show a sport's discipleship "collapsing" on a night it
  // simply did not run. Those points break the ribbon instead, so the area is
  // emitted as one closed subpath per run of nights that actually happened.
  const runs = useMemo(() => {
    const out: number[][] = [];
    let current: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mode !== "share" || totals[i] > 0) {
        current.push(i);
      } else if (current.length) {
        out.push(current);
        current = [];
      }
    }
    if (current.length) out.push(current);
    return out;
  }, [mode, totals, n]);

  const visibleLabelIndices = useMemo(() => {
    const maxLabels = Math.max(1, Math.floor(plotWidth / MIN_LABEL_GAP));
    const stride = Math.max(1, Math.ceil(n / maxLabels));
    const indices = new Set<number>();
    for (let i = 0; i < n; i += stride) indices.add(i);
    if (n > 0) indices.add(n - 1);
    return indices;
  }, [n, plotWidth]);

  if (n === 0 || totals.every((t) => t === 0)) {
    return (
      <div className="flex h-[160px] items-center justify-center rounded-lg border border-dashed border-border text-[12px] text-ink-secondary">
        {emptyLabel ?? "No data yet"}
      </div>
    );
  }

  const xFor = (i: number) => (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth) + PAD_LEFT;
  const yFor = (value: number, total: number) => {
    const v = mode === "share" ? (total > 0 ? value / total : 0) : value;
    return PAD_TOP + plotHeight - (v / maxValue) * plotHeight;
  };

  const areaPath = (lower: number[], upper: number[]) =>
    runs
      .map((run) => {
        const top = run
          .map((i, k) => `${k === 0 ? "M" : "L"} ${xFor(i)} ${yFor(upper[i], totals[i])}`)
          .join(" ");
        const bottom = [...run]
          .reverse()
          .map((i) => `L ${xFor(i)} ${yFor(lower[i], totals[i])}`)
          .join(" ");
        return `${top} ${bottom} Z`;
      })
      .join(" ");

  const yTicks = mode === "share" ? [0, 0.5, 1] : [0, maxValue / 2, maxValue];
  const tickLabel = (t: number) => (mode === "share" ? `${Math.round(t * 100)}%` : String(Math.round(t)));

  return (
    <div>
      {(!hideLegend || !compact) && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {!hideLegend &&
              bands.map((b) => (
                <div key={b.key} className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
                  <span
                    className="inline-block size-2 rounded-[2px]"
                    style={{ backgroundColor: b.color }}
                    aria-hidden
                  />
                  {b.label}
                </div>
              ))}
          </div>
          {!compact && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="shrink-0 text-[12px] font-medium text-ink-secondary underline decoration-border-strong underline-offset-2 hover:text-ink"
            >
              {showTable ? "View as chart" : "View as table"}
            </button>
          )}
        </div>
      )}

      {showTable ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-border text-ink-secondary">
                <th className="py-2 font-medium">{categoryLabel}</th>
                {bands.map((b) => (
                  <th key={b.key} className="py-2 font-medium tabular-nums">
                    {b.label}
                  </th>
                ))}
                <th className="py-2 font-medium tabular-nums">Total</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={cat} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap py-2 text-ink">{categoryLabels[i]}</td>
                  {bands.map((b) => (
                    <td key={b.key} className="py-2 tabular-nums text-ink">
                      {b.values[i] ?? 0}
                    </td>
                  ))}
                  <td className="py-2 tabular-nums font-medium text-ink">{totals[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-2">
          <div className="relative overflow-x-auto">
            <svg
              role="img"
              aria-labelledby={titleId}
              viewBox={`0 0 ${WIDTH} ${height}`}
              className="w-full min-w-[360px]"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <title id={titleId}>{title}</title>

              {yTicks.map((tick) => (
                <line
                  key={tick}
                  x1={PAD_LEFT}
                  x2={WIDTH - PAD_RIGHT}
                  y1={PAD_TOP + plotHeight - (tick / maxValue) * plotHeight}
                  y2={PAD_TOP + plotHeight - (tick / maxValue) * plotHeight}
                  stroke="var(--color-chart-grid)"
                  strokeWidth={1}
                />
              ))}
              {yTicks.map((tick) => (
                <text
                  key={`t-${tick}`}
                  x={PAD_LEFT - 6}
                  y={PAD_TOP + plotHeight - (tick / maxValue) * plotHeight}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-ink-secondary text-[11px]"
                >
                  {tickLabel(tick)}
                </text>
              ))}

              {stacked.map(({ band, lower, upper }) => (
                <path
                  key={band.key}
                  d={areaPath(lower, upper)}
                  fill={band.color}
                  opacity={hoverIndex === null ? 1 : 0.82}
                  className="transition-opacity duration-150 ease-out"
                />
              ))}

              {categories.map((cat, i) =>
                visibleLabelIndices.has(i) ? (
                  <text
                    key={cat}
                    x={xFor(i)}
                    y={height - 8}
                    textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"}
                    className="fill-ink-secondary text-[11px]"
                  >
                    {categoryLabels[i]}
                  </text>
                ) : null,
              )}

              {hoverIndex !== null && (
                <line
                  x1={xFor(hoverIndex)}
                  x2={xFor(hoverIndex)}
                  y1={PAD_TOP}
                  y2={PAD_TOP + plotHeight}
                  stroke="var(--color-ink)"
                  strokeWidth={1}
                  opacity={0.35}
                />
              )}

              {categories.map((_, i) => (
                <rect
                  key={`hit-${i}`}
                  x={xFor(i) - plotWidth / Math.max(n, 1) / 2}
                  y={PAD_TOP}
                  width={plotWidth / Math.max(n, 1)}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                  onFocus={() => setHoverIndex(i)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${categoryLabels[i]}: ${bands
                    .map((b) => `${b.label} ${b.values[i] ?? 0}`)
                    .join(", ")}, total ${totals[i]}`}
                />
              ))}
            </svg>

            {hoverIndex !== null && (
              <div
                className="pointer-events-none absolute top-0 z-10 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-[var(--shadow-card)]"
                style={{
                  left: `${(xFor(hoverIndex) / WIDTH) * 100}%`,
                  transform: `translate(${hoverIndex > n / 2 ? "-100%" : "0"}, -100%)`,
                }}
              >
                <div className="font-medium text-ink">{categoryLabels[hoverIndex]}</div>
                {[...bands].reverse().map((b) => (
                  <div key={b.key} className="mt-0.5 flex items-center gap-1.5 tabular-nums text-ink-secondary">
                    <span
                      className="inline-block size-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: b.color }}
                      aria-hidden
                    />
                    <span className="font-semibold text-ink">{b.values[hoverIndex] ?? 0}</span>
                    <span>{b.label}</span>
                    {totals[hoverIndex] > 0 && (
                      <span className="text-ink-secondary">
                        ({Math.round(((b.values[hoverIndex] ?? 0) / totals[hoverIndex]) * 100)}%)
                      </span>
                    )}
                  </div>
                ))}
                <div className="mt-1 border-t border-border pt-1 tabular-nums text-ink">
                  <span className="font-semibold">{totals[hoverIndex]}</span> attended
                </div>
              </div>
            )}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-surface sm:hidden"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
