"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { StackedAreaChart } from "@/components/charts/stacked-area-chart";
import { Panel, PanelHeader, SegmentMixBar } from "@/components/dashboard/panel";
import { clsx } from "@/lib/clsx";
import { DGROUP_SEGMENTS, isUnplaced, type DGroupSegment } from "@/lib/dgroup";

export interface SportFacet {
  sport: string;
  total: number;
  allTimeCounts: Record<DGroupSegment, number>;
  points: { gameNightId: string; label: string; counts: Record<DGroupSegment, number> }[];
}

/**
 * The third option is the accessibility path, not a convenience. Compact
 * charts hide their own "View as table" button, so without this the small
 * multiples had no table twin — and a tooltip must never be the only way to
 * read a value. One switch turns all six facets at once.
 */
const VIEWS = [
  { id: "count", label: "Count" },
  { id: "share", label: "Ratio" },
  { id: "table", label: "Table" },
] as const;

type FacetView = (typeof VIEWS)[number]["id"];

/**
 * Small multiples, one per sport, with a single shared legend and one shared
 * count/share switch.
 *
 * Total first, then alphabetically — the same order the attendance panel
 * uses, so the two can be read against each other position by position.
 *
 * "Ratio" is the question the ministry actually asks of a sport — not how
 * many uninvolved people came, which mostly tracks how popular the sport is,
 * but what fraction of that room was uninvolved. Counts and shares answer
 * different questions off the same bands, so they are a toggle rather than
 * two duplicate chart sets.
 */
export function SportMixPanel({
  facets,
  segmentColor,
  coverage,
}: {
  facets: SportFacet[];
  segmentColor: Record<DGroupSegment, string>;
  /**
   * Share of attendances carrying their own answer. Mandatory, not optional
   * garnish: below full coverage the historical composition is substantially
   * today's status painted backwards, and a reader who does not know that
   * will read an inference as a measurement.
   */
  coverage: number;
}) {
  const [view, setView] = useState<FacetView>("count");
  const mode = view === "table" ? "count" : view;

  return (
    <Panel className="mt-3">
      <PanelHeader
        title="Discipleship mix by sport"
        icon={LayoutGrid}
        subtitle={`${Math.round(coverage * 100)}% answered on the night they came`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {/* Wraps rather than hides on narrow screens — it is the only key
                the five charts below have. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {DGROUP_SEGMENTS.map((segment) => (
                <div key={segment} className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
                  <span
                    className="inline-block size-2 rounded-[2px]"
                    style={{ backgroundColor: segmentColor[segment] }}
                    aria-hidden
                  />
                  {segment}
                </div>
              ))}
            </div>
            <div
              className="flex shrink-0 rounded-[7px] border border-border-strong p-0.5"
              role="group"
              aria-label="Discipleship mix scale"
            >
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  aria-pressed={view === v.id}
                  className={clsx(
                    "rounded-[5px] px-2 py-1 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface pointer-coarse:min-h-11 pointer-coarse:px-3",
                    view === v.id ? "bg-surface-subtle text-ink" : "text-ink-secondary hover:text-ink",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-x-5 gap-y-6 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {facets.map((facet) => {
          const notInGroup = DGROUP_SEGMENTS.filter(isUnplaced).reduce(
            (sum, segment) => sum + (facet.allTimeCounts[segment] ?? 0),
            0,
          );
          const share = facet.total > 0 ? Math.round((notInGroup / facet.total) * 100) : 0;
          return (
            <div key={facet.sport}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-ink">{facet.sport}</h3>
                <div className="text-[12px] tabular-nums text-ink-secondary">
                  {facet.total.toLocaleString()} attendances
                </div>
              </div>

              <div className="mt-2">
                <SegmentMixBar
                  total={facet.total}
                  segments={DGROUP_SEGMENTS.map((segment) => ({
                    label: segment,
                    value: facet.allTimeCounts[segment],
                    color: segmentColor[segment],
                  }))}
                />
                <div className="mt-1.5 text-[12px] text-ink-secondary">
                  <span className="font-semibold text-ink">{share}%</span> not in a group, all season
                </div>
              </div>

              <div className="mt-3">
                <StackedAreaChart
                  title={`${facet.sport}: discipleship segments per game night`}
                  categoryLabel="Game night"
                  categories={facet.points.map((p) => p.gameNightId)}
                  categoryLabels={facet.points.map((p) => p.label)}
                  bands={DGROUP_SEGMENTS.map((segment) => ({
                    key: segment,
                    label: segment,
                    color: segmentColor[segment],
                    values: facet.points.map((p) => p.counts[segment]),
                  }))}
                  mode={mode}
                  asTable={view === "table"}
                  height={150}
                  compact
                  hideLegend
                />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
