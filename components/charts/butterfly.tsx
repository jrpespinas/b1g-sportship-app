import { clsx } from "@/lib/clsx";
import type { SupplyDemandDimension } from "@/lib/supply-demand";

/**
 * What leaders offer, mirrored against what seekers want, on one shared
 * percentage axis.
 *
 * The mirror is the whole point: a reader is asking whether the two sides
 * lean the same way, and two wings on a shared centre answer that in one look
 * where two separate bar charts would leave it to be inferred. It is the same
 * form as the age pyramid one panel above, deliberately — both questions are
 * about shape rather than size.
 *
 * Bars are each side's **share of its own population**, because the
 * populations differ better than two to one. On a shared count axis every
 * seeker bar would land at roughly half its leader counterpart and
 * proportional agreement would read as a shortfall. The number beside a bar
 * is therefore the share, matching what the bar encodes; the raw count is in
 * the row's tooltip.
 *
 * Colours are the segment palette, unchanged: leaders keep their blue and
 * seekers their burnt orange, so a reader who learned the funnel reads this
 * panel without a second legend.
 */
const OFFER = "var(--color-seg-leaders)";
const WANT = "var(--color-seg-seekers)";

export function Butterfly({
  dimension,
  offerRespondents,
  wantRespondents,
}: {
  dimension: SupplyDemandDimension;
  offerRespondents: number;
  wantRespondents: number;
}) {
  const widest = Math.max(
    0.01,
    ...dimension.rows.flatMap((r) => [r.offerShare, r.wantShare]),
  );
  const pct = (share: number) => `${Math.round(share * 100)}%`;

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          {dimension.title}
          {/* The space is a real text node, not CSS `gap`. Without it the
              accessible name concatenates into "Time of daytop choices
              differ" — flex spacing never reaches the accessibility tree. */}
          {!dimension.agrees && " "}
          {/* The finding sits on the dimension it belongs to. A rank test, not
              a distance: see lib/supply-demand.ts on why. */}
          {!dimension.agrees && (
            <span className="rounded-[4px] bg-accent-tint px-1.5 py-px text-[11px] font-medium text-accent-ink">
              top choices differ
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-ink-secondary">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-[2px]" style={{ backgroundColor: OFFER }} aria-hidden />
            {offerRespondents} leaders
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-[2px]" style={{ backgroundColor: WANT }} aria-hidden />
            {wantRespondents} seekers
          </span>
        </div>
      </div>

      <ul className="mt-2.5 space-y-1">
        {dimension.rows.map((row) => {
          const top = row.label === dimension.offerTop || row.label === dimension.wantTop;
          return (
            <li
              key={row.label}
              className="flex items-center gap-2 text-[11px]"
              title={`${row.label}: ${row.offer} of ${offerRespondents} leaders, ${row.want} of ${wantRespondents} seekers`}
            >
              <span className="w-8 shrink-0 text-right tabular-nums text-ink-secondary">
                {pct(row.offerShare)}
              </span>
              <span className="flex min-w-0 flex-1 justify-end">
                <span
                  className="block h-3.5 rounded-l-[3px]"
                  style={{ width: `${(row.offerShare / widest) * 100}%`, backgroundColor: OFFER }}
                />
              </span>
              <span
                className={clsx(
                  "w-[86px] shrink-0 text-center",
                  top ? "font-semibold text-ink" : "text-ink-secondary",
                )}
              >
                {row.label}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block h-3.5 rounded-r-[3px]"
                  style={{ width: `${(row.wantShare / widest) * 100}%`, backgroundColor: WANT }}
                />
              </span>
              <span className="w-8 shrink-0 tabular-nums text-ink-secondary">{pct(row.wantShare)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
