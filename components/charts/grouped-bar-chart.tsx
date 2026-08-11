"use client";

import { useId, useMemo, useState } from "react";
import { clsx } from "@/lib/clsx";

export interface GroupedBarSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface GroupedBarChartProps {
  categories: string[];
  series: [GroupedBarSeries, GroupedBarSeries];
  title: string;
  categoryLabel: string;
  emptyLabel?: string;
}

const WIDTH = 640;
const HEIGHT = 240;
const PAD_LEFT = 32;
const PAD_RIGHT = 16;
const PAD_TOP = 8;
const PAD_BOTTOM = 28;
const CLUSTER_MAX_WIDTH = 40;
const BAR_GAP = 2;
const RADIUS = 4;

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Rounded top corners, square baseline — per the mark spec, never rounded on all four. */
function topRoundedBarPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(RADIUS, width / 2, height);
  if (height <= r) {
    return `M ${x} ${y + height} L ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} Z`;
  }
  return [
    `M ${x} ${y + height}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height}`,
    "Z",
  ].join(" ");
}

export function GroupedBarChart({ categories, series, title, categoryLabel, emptyLabel }: GroupedBarChartProps) {
  const titleId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const n = categories.length;
  const maxValue = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    return niceMax(Math.max(1, ...all));
  }, [series]);

  if (n === 0 || series.every((s) => s.values.every((v) => v === 0))) {
    return (
      <div className="flex h-[160px] items-center justify-center rounded-xl border border-dashed border-border text-[13px] text-ink-tertiary">
        {emptyLabel ?? "No data yet"}
      </div>
    );
  }

  const slot = plotWidth / n;
  const clusterWidth = Math.min(CLUSTER_MAX_WIDTH, slot * 0.7);
  const barWidth = (clusterWidth - BAR_GAP) / 2;
  const xForCluster = (i: number) => PAD_LEFT + slot * i + slot / 2;
  const xForBar = (i: number, seriesIndex: number) =>
    xForCluster(i) - clusterWidth / 2 + seriesIndex * (barWidth + BAR_GAP);
  const yFor = (v: number) => PAD_TOP + plotHeight - (v / maxValue) * plotHeight;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
              {s.label}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-[13px] font-medium text-ink-secondary underline decoration-border-strong underline-offset-2 hover:text-ink"
        >
          {showTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <table className="mt-4 w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-ink-secondary">
              <th className="py-2 font-medium">{categoryLabel}</th>
              {series.map((s) => (
                <th key={s.key} className="py-2 font-medium tabular-nums">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => (
              <tr key={cat} className="border-b border-border last:border-0">
                <td className="py-2 text-ink">{cat}</td>
                {series.map((s) => (
                  <td key={s.key} className="py-2 tabular-nums text-ink">
                    {s.values[i]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative mt-2">
          <div className="relative overflow-x-auto">
            <svg role="img" aria-labelledby={titleId} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[400px]">
              <title id={titleId}>{title}</title>

              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yFor(0)}
                y2={yFor(0)}
                stroke="var(--color-chart-axis)"
                strokeWidth={1}
              />

              {categories.map((cat, i) => (
                <g key={cat}>
                  {series.map((s, si) => {
                    const value = s.values[i];
                    const barHeight = plotHeight - (yFor(value) - PAD_TOP);
                    const x = xForBar(i, si);
                    const y = yFor(value);
                    return (
                      <path
                        key={s.key}
                        d={topRoundedBarPath(x, y, barWidth, Math.max(barHeight, 1))}
                        fill={s.color}
                        opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.55}
                        className="transition-opacity duration-150 ease-out"
                      />
                    );
                  })}
                  <text x={xForCluster(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-secondary text-[11px]">
                    {cat}
                  </text>
                  <rect
                    x={PAD_LEFT + slot * i}
                    y={PAD_TOP}
                    width={slot}
                    height={plotHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                    onFocus={() => setHoverIndex(i)}
                    onBlur={() => setHoverIndex(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${cat}: ${series.map((s) => `${s.label} ${s.values[i]}`).join(", ")}`}
                  />
                </g>
              ))}
            </svg>

            {hoverIndex !== null && (
              <div
                className="pointer-events-none absolute top-0 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-[var(--shadow-card)]"
                style={{
                  left: `${(xForCluster(hoverIndex) / WIDTH) * 100}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="font-medium text-ink">{categories[hoverIndex]}</div>
                {series.map((s) => (
                  <div key={s.key} className={clsx("flex items-center gap-1.5 tabular-nums text-ink-secondary")}>
                    <span className="inline-block size-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                    <span className="font-semibold text-ink">{s.values[hoverIndex]}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
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
