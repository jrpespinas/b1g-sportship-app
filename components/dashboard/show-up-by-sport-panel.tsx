"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { StackedAreaChart } from "@/components/charts/stacked-area-chart";
import { Panel, PanelHeader, SegmentMixBar } from "@/components/dashboard/panel";
import { clsx } from "@/lib/clsx";
import { formatDate } from "@/lib/format-date";
import { TOTAL_FACET } from "@/lib/facets";
import type { SportShowUpSeries } from "@/lib/dashboard-metrics";

const CAME = "var(--color-blue-5)";
const NO_SHOW = "var(--color-series-noshow)";

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
 * Arrivals and no-shows per sport per game night.
 *
 * Small multiples in the same grid as the discipleship mix above it, because
 * the question is comparative — which room empties out — and five series
 * fighting inside one plot answers it worse than five plots on a shared
 * y-scale.
 *
 * The Total facet is drawn first and the sports run alphabetically after it,
 * matching the discipleship-mix panel below, so the two grids can be read
 * against each other position by position — and so every sport is read
 * against the season's own shape rather than against the sport beside it. The
 * sport people register for and skip is marked with a chip instead of being
 * promoted to first place: the finding stays findable without costing the two
 * panels their shared order.
 *
 * The top edge of each stack is that sport's registrations, and registration
 * is slot-capped — 30 a night for most sports, 60 for Pickleball. So the
 * outline is deliberately flat and the whole signal is the boundary inside
 * it. That is the argument the panel makes: the room is always full on paper.
 */
export function ShowUpBySportPanel({
  series,
  nightsWithFile,
  totalNights,
}: {
  series: SportShowUpSeries[];
  nightsWithFile: number;
  totalNights: number;
}) {
  const [view, setView] = useState<FacetView>("count");
  const mode = view === "table" ? "count" : view;

  // Lowest show-up rate, computed rather than assumed from position — the
  // series arrives Total first, then alphabetical. The Total facet is the
  // baseline every sport is read against, so it can never be the worst room.
  const worst = series.reduce<SportShowUpSeries | undefined>(
    (lowest, facet) =>
      facet.sport === TOTAL_FACET ? lowest : !lowest || facet.rate < lowest.rate ? facet : lowest,
    undefined,
  );

  return (
    <Panel className="mt-3">
      <PanelHeader
        title="Attendance by sport"
        icon={ClipboardCheck}
        subtitle={`People who registered · ${nightsWithFile} of ${totalNights} nights`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {/* Wraps rather than hides on narrow screens — it is the only key
                the five charts below have. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {[
                { label: "Attended", color: CAME },
                { label: "Did not attend", color: NO_SHOW },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
                  <span
                    className="inline-block size-2 rounded-[2px]"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  {item.label}
                </div>
              ))}
            </div>
            <div
              className="flex shrink-0 rounded-[7px] border border-border-strong p-0.5"
              role="group"
              aria-label="Attendance scale"
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
        {series.map((facet) => (
          <div key={facet.sport}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                {facet.sport}
                {/* A real space, so the name does not announce as
                    "Runninglowest show-up" — see butterfly.tsx. */}
                {facet === worst && " "}
                {/* The finding, on the facet it belongs to, instead of a
                    sentence in the panel header naming one sport. */}
                {facet === worst && (
                  <span className="rounded-[4px] bg-accent-tint px-1.5 py-px text-[11px] font-medium tabular-nums text-accent-ink">
                    lowest show-up
                  </span>
                )}
              </h3>
              <div className="text-[12px] tabular-nums text-ink-secondary">
                {facet.registered.toLocaleString()} registrations
              </div>
            </div>

            <div className="mt-2">
              <SegmentMixBar
                total={facet.registered}
                segments={[
                  { label: "attended", value: facet.came, color: CAME },
                  { label: "did not attend", value: facet.registered - facet.came, color: NO_SHOW },
                ]}
              />
              <div className="mt-1.5 text-[12px] text-ink-secondary">
                <span className="font-semibold text-ink">{Math.round(facet.rate * 100)}%</span> attended, all
                season
              </div>
            </div>

            <div className="mt-3">
              <StackedAreaChart
                title={`${facet.sport}: arrivals and no-shows per game night`}
                categoryLabel="Game night"
                categories={facet.points.map((p) => p.gameNightId)}
                categoryLabels={facet.points.map((p) => formatDate(p.date))}
                // Arrivals on the bottom, against the flat baseline where a
                // band is read most accurately — it is the quantity anyone
                // acts on. That also makes the top edge registrations.
                bands={[
                  { key: "came", label: "Attended", color: CAME, values: facet.points.map((p) => p.came) },
                  {
                    key: "noShow",
                    label: "Did not attend",
                    color: NO_SHOW,
                    values: facet.points.map((p) => p.noShow),
                  },
                ]}
                mode={mode}
                asTable={view === "table"}
                height={150}
                compact
                hideLegend
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

