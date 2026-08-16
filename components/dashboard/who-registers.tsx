import { Users } from "lucide-react";
import { MetricPanel } from "@/components/dashboard/panel";
import { Panel, PanelHeader } from "@/components/ui/panel";
import type { RegistrationDemographics } from "@/lib/dashboard-metrics";

/**
 * Who signs up, as a bento of independent tiles rather than one stacked panel.
 *
 * These readings were grouped while they shared a question — an age-rooted
 * cross-tab tied them together, and every figure was a cut of it. With that
 * removed (2026-08-14) they are four separate facts about the same people, and
 * a single tall panel with three internal rules was asserting a relationship
 * they no longer have. The mosaic keeps them adjacent without claiming they
 * are one argument.
 *
 * The pyramid anchors it at eight columns because it is the only one of the
 * four whose *shape* carries the finding — from 25 up the roster is 46–49%
 * women, and at 18–24 it is 31%. A mirrored pair on a shared centre answers
 * "does it lean the same way at every age" in one look, where two stacked bar
 * charts would leave it to be inferred.
 *
 * Civil status and church stay as numbers rather than charts: 87% single and
 * 71% CCF do not earn a plot. Workplace area is charted because location is a
 * DGroup matching criterion, which makes its distribution operational rather
 * than descriptive.
 */
const MALE = "var(--color-blue-3)";
const FEMALE = "var(--color-blue-6)";

export function WhoRegisters({ demographics: d }: { demographics: RegistrationDemographics }) {
  const widest = Math.max(1, ...d.pyramid.flatMap((r) => [r.male, r.female]));

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
      {/* The anchor tile. It keeps the panel header — and with it the
          population statement — because it is the tile a reader scanning the
          page's sections stops on; the others are figures under their own
          labels, the same construction as the metric row above. */}
      <Panel className="lg:col-span-8">
        <PanelHeader
          title="Who registers, by age"
          icon={Users}
          subtitle={`All ${d.total.toLocaleString()} players`}
        />
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3 className="text-[13px] font-semibold text-ink">Age and gender</h3>
            <div className="flex items-center gap-3 text-[12px] text-ink-secondary">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-[2px]" style={{ backgroundColor: MALE }} aria-hidden />
                {d.male.toLocaleString()} men
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-[2px]" style={{ backgroundColor: FEMALE }} aria-hidden />
                {d.female.toLocaleString()} women
              </span>
            </div>
          </div>

          <ul className="mt-3 space-y-1.5">
            {d.pyramid.map((row) => {
              const known = row.male + row.female;
              const femaleShare = known > 0 ? row.female / known : 0;
              return (
                <li key={row.band} className="flex items-center gap-2 text-[12px]">
                  {/* Men run right-to-left, women left-to-right, from a shared
                      centre — the mirror is what makes an uneven band visible
                      without reading two numbers. */}
                  <span className="w-8 shrink-0 text-right tabular-nums text-ink-secondary">{row.male}</span>
                  <span className="flex min-w-0 flex-1 justify-end">
                    <span
                      className="block h-5 rounded-l-[3px]"
                      style={{ width: `${(row.male / widest) * 100}%`, backgroundColor: MALE }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-center font-medium text-ink">{row.band}</span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block h-5 rounded-r-[3px]"
                      style={{ width: `${(row.female / widest) * 100}%`, backgroundColor: FEMALE }}
                    />
                  </span>
                  <span className="w-8 shrink-0 tabular-nums text-ink-secondary">{row.female}</span>
                  <span className="w-10 shrink-0 text-right font-medium tabular-nums text-ink">
                    {Math.round(femaleShare * 100)}%
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[12px] text-ink-secondary">
            The right-hand figure is the share who are women — steady from 25 up, and lowest among the
            youngest.
          </p>
        </div>
      </Panel>

      <Panel className="lg:col-span-4">
        <div className="p-5">
          <h3 className="text-[13px] font-semibold text-ink">Where they work</h3>
          <ul className="mt-3 space-y-1.5">
            {d.locations.map((location) => (
              <li key={location.label} className="flex items-center gap-3 text-[12px]">
                <span className="w-24 shrink-0 truncate text-ink">{location.label}</span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block h-3 rounded-[3px] bg-blue-4"
                    style={{ width: `${(location.count / (d.locations[0]?.count || 1)) * 100}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums text-ink-secondary">
                  {location.count}
                </span>
              </li>
            ))}
          </ul>
          {d.otherLocations > 0 && (
            <p className="mt-2 text-[12px] text-ink-secondary">
              {d.otherLocations.toLocaleString()} more across other areas.
            </p>
          )}
        </div>
      </Panel>

      {/* Equal thirds below the 8/4 top row. The rhythm is already set by the
          row above; giving these three different widths would only make the
          shortest list the widest tile, since content and column count do not
          correlate here. */}
      <MetricPanel
        className="lg:col-span-4"
        label="Median age"
        value={d.medianAge ?? "—"}
        note={`Birth year on ${d.withAge.toLocaleString()} of ${d.total.toLocaleString()} players, year only — a birth month cannot make a five-year band more accurate.`}
      />

      <Splits title="Civil status" splits={d.civilStatus} total={d.total} className="lg:col-span-4" />
      <Splits title="Church" splits={d.church} total={d.total} className="lg:col-span-4" />
    </div>
  );
}

function Splits({
  title,
  splits,
  total,
  className,
}: {
  title: string;
  splits: { label: string; count: number }[];
  total: number;
  className?: string;
}) {
  // Everyone the listed answers do not account for. Without this the column
  // silently loses people — church reads 71% and 22% and leaves 7% of the
  // roster unexplained, which invites the reader to assume a rounding error.
  const stated = splits.reduce((sum, split) => sum + split.count, 0);
  const notStated = Math.max(0, total - stated);

  return (
    <Panel className={className}>
      <div className="p-5">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        <ul className="mt-3 space-y-1.5">
          {splits.map((split) => (
            <li key={split.label} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="truncate text-ink-secondary">{split.label}</span>
              <span className="shrink-0 tabular-nums text-ink-secondary">
                <span className="font-medium text-ink">{split.count.toLocaleString()}</span>{" "}
                <span className="text-ink-tertiary" aria-hidden>·</span> {formatShare(split.count, total)}
              </span>
            </li>
          ))}
          {notStated > 0 && (
            <li className="flex items-baseline justify-between gap-3 text-[12px] text-ink-secondary">
              <span className="truncate">Not stated</span>
              <span className="shrink-0 tabular-nums">
                {notStated.toLocaleString()} <span>·</span> {formatShare(notStated, total)}
              </span>
            </li>
          )}
        </ul>
      </div>
    </Panel>
  );
}

/**
 * A real count never rounds away to "0%". Three separated players beside a
 * flat zero reads as a bug in the page rather than as three people.
 */
function formatShare(count: number, total: number): string {
  if (total <= 0) return "—";
  const share = (count / total) * 100;
  if (count > 0 && share < 0.5) return "<1%";
  return `${Math.round(share)}%`;
}
