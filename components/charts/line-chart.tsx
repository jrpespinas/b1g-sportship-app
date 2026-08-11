"use client";

import { useId, useMemo, useState } from "react";
import { clsx } from "@/lib/clsx";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface TrendLineChartProps {
  categories: string[];
  categoryLabels: string[];
  series: [LineSeries, LineSeries];
  emptyLabel?: string;
}

const WIDTH = 640;
const HEIGHT = 260;
const PAD_LEFT = 36;
const PAD_RIGHT = 34;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function TrendLineChart({ categories, categoryLabels, series, emptyLabel }: TrendLineChartProps) {
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

  const xFor = (i: number) => (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth) + PAD_LEFT;
  const yFor = (v: number) => PAD_TOP + plotHeight - (v / maxValue) * plotHeight;

  const yTicks = [0, maxValue / 2, maxValue];

  // Thin x-axis labels once the season has enough game nights that every date
  // would collide — always keep the first and, critically, the last (the
  // newest game night, the one number a viewer actually came to check).
  const MIN_LABEL_GAP = 56;
  const maxLabels = Math.max(1, Math.floor(plotWidth / MIN_LABEL_GAP));
  const labelStride = Math.max(1, Math.ceil(n / maxLabels));
  const visibleLabelIndices = useMemo(() => {
    const indices = new Set<number>();
    for (let i = 0; i < n; i += labelStride) indices.add(i);
    if (n > 0) indices.add(n - 1);
    return indices;
  }, [n, labelStride]);

  if (n === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border text-[13px] text-ink-tertiary">
        {emptyLabel ?? "No data yet"}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
              <span
                className="inline-block h-[2px] w-4 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
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
              <th className="py-2 font-medium">Game night</th>
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
                <td className="py-2 text-ink">{categoryLabels[i]}</td>
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
        <div className="relative mt-4">
        <div className="relative overflow-x-auto">
          <svg
            role="img"
            aria-labelledby={titleId}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full min-w-[400px]"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <title id={titleId}>{`${series.map((s) => s.label).join(" vs. ")} per game night`}</title>

            {yTicks.map((tick) => (
              <line
                key={tick}
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="var(--color-chart-grid)"
                strokeWidth={1}
              />
            ))}
            {yTicks.map((tick) => (
              <text
                key={`label-${tick}`}
                x={PAD_LEFT - 8}
                y={yFor(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-ink-secondary text-[11px]"
              >
                {Math.round(tick)}
              </text>
            ))}

            {categories.map((cat, i) =>
              visibleLabelIndices.has(i) ? (
                <text
                  key={cat}
                  x={xFor(i)}
                  y={HEIGHT - 8}
                  textAnchor={i === n - 1 ? "end" : "middle"}
                  className="fill-ink-secondary text-[11px]"
                >
                  {categoryLabels[i]}
                </text>
              ) : null,
            )}

            {series.map((s) => {
              const path = s.values.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`).join(" ");
              return n > 1 ? (
                <path
                  key={s.key}
                  d={path}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null;
            })}

            {series.map((s) =>
              s.values.map((v, i) => (
                <circle
                  key={`${s.key}-${i}`}
                  cx={xFor(i)}
                  cy={yFor(v)}
                  r={hoverIndex === i ? 5 : 4}
                  fill={s.color}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                  className="transition-[r] duration-150 ease-out"
                />
              )),
            )}

            {series.map((s) => {
              const lastIndex = n - 1;
              return (
                <text
                  key={`${s.key}-end-label`}
                  x={xFor(lastIndex) + 8}
                  y={yFor(s.values[lastIndex])}
                  dominantBaseline="middle"
                  className="fill-ink text-[12px] font-medium"
                >
                  {s.values[lastIndex]}
                </text>
              );
            })}

            {hoverIndex !== null && (
              <line
                x1={xFor(hoverIndex)}
                x2={xFor(hoverIndex)}
                y1={PAD_TOP}
                y2={PAD_TOP + plotHeight}
                stroke="var(--color-chart-axis)"
                strokeWidth={1}
              />
            )}

            {categories.map((_, i) => (
              <rect
                key={`hit-${i}`}
                x={xFor(i) - (plotWidth / Math.max(n, 1)) / 2}
                y={PAD_TOP}
                width={plotWidth / Math.max(n, 1)}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onFocus={() => setHoverIndex(i)}
                tabIndex={0}
                role="button"
                aria-label={`${categoryLabels[i]}: ${series.map((s) => `${s.label} ${s.values[i]}`).join(", ")}`}
              />
            ))}
          </svg>

          {hoverIndex !== null && (
            <div
              className="pointer-events-none absolute top-0 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-[var(--shadow-card)]"
              style={{
                left: `${(xFor(hoverIndex) / WIDTH) * 100}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="font-medium text-ink">{categoryLabels[hoverIndex]}</div>
              {series.map((s) => (
                <div key={s.key} className={clsx("flex items-center gap-1.5 tabular-nums text-ink-secondary")}>
                  <span
                    className="inline-block h-[2px] w-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
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
