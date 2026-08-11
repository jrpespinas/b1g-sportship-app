"use client";

import { useId, useMemo, useState } from "react";

export interface BarDatum {
  label: string;
  value: number;
}

interface RankedBarChartProps {
  data: BarDatum[];
  title: string;
  categoryLabel: string;
  valueLabel: string;
  color?: string;
  emptyLabel?: string;
}

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 32;
const PAD_RIGHT = 16;
const PAD_TOP = 8;
const PAD_BOTTOM = 28;
const BAR_MAX_THICKNESS = 24;
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

export function RankedBarChart({
  data,
  title,
  categoryLabel,
  valueLabel,
  color = "var(--color-accent)",
  emptyLabel,
}: RankedBarChartProps) {
  const titleId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const n = data.length;
  const maxValue = useMemo(() => niceMax(Math.max(1, ...data.map((d) => d.value))), [data]);

  if (n === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-[160px] items-center justify-center rounded-xl border border-dashed border-border text-[13px] text-ink-tertiary">
        {emptyLabel ?? "No data yet"}
      </div>
    );
  }

  const slot = plotWidth / n;
  const barWidth = Math.min(BAR_MAX_THICKNESS, slot * 0.5);
  const xFor = (i: number) => PAD_LEFT + slot * i + slot / 2;
  const yFor = (v: number) => PAD_TOP + plotHeight - (v / maxValue) * plotHeight;

  return (
    <div>
      <div className="flex justify-end">
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
              <th className="py-2 font-medium tabular-nums">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-border last:border-0">
                <td className="py-2 text-ink">{d.label}</td>
                <td className="py-2 tabular-nums text-ink">{d.value}</td>
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

              {data.map((d, i) => {
                const barHeight = plotHeight - (yFor(d.value) - PAD_TOP);
                const x = xFor(i) - barWidth / 2;
                const y = yFor(d.value);
                return (
                  <g key={d.label}>
                    <path
                      d={topRoundedBarPath(x, y, barWidth, Math.max(barHeight, 1))}
                      fill={color}
                      opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.55}
                      className="transition-opacity duration-150 ease-out"
                    />
                    <text x={xFor(i)} y={y - 6} textAnchor="middle" className="fill-ink text-[12px] font-medium">
                      {d.value}
                    </text>
                    <text x={xFor(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-secondary text-[11px]">
                      {d.label}
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
                      aria-label={`${d.label}: ${d.value} ${valueLabel}`}
                    />
                  </g>
                );
              })}
            </svg>

            {hoverIndex !== null && (
              <div
                className="pointer-events-none absolute top-0 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-[var(--shadow-card)]"
                style={{
                  left: `${(xFor(hoverIndex) / WIDTH) * 100}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="font-medium text-ink">{data[hoverIndex].label}</div>
                <div className="flex items-center gap-1.5 text-ink-secondary">
                  <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                  <span className="font-semibold text-ink">{data[hoverIndex].value}</span>
                  {valueLabel}
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
