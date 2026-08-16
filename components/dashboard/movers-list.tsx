import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MovementReport } from "@/lib/dashboard-metrics";

/**
 * How many people changed where they stand, in three figures.
 *
 * **The names were here and were removed on request (2026-08-14.)** The list
 * is still the more actionable artifact — those are people to follow up with —
 * so it did not disappear, it moved: `/players?view=moved` is the same set as
 * a worklist, with contact details and export, which is where a follow-up
 * actually happens. This panel keeps the count and hands off.
 *
 * Still not a chart. A couple of dozen movers out of a thousand players
 * cannot support a trend line, and three numbers do not need one.
 *
 * The three are kept separate rather than summed because they are not the
 * same news: forward is the ministry working, backward is worth a
 * conversation, and unclear is a data problem — a round trip, or a flip
 * between "D12" and "DGroup Member", which the form's own wording confuses.
 */
export function MoversList({ report }: { report: MovementReport }) {
  const figures = [
    { value: report.forward, label: "moved up" },
    { value: report.backward, label: "stepped back" },
    {
      value: report.uncertain,
      label: "unclear",
      title:
        "Round trips, and flips between D12 and DGroup Member — labels the form's own wording confuses.",
    },
  ].filter((f) => f.value > 0);

  return (
    <div className="flex h-full flex-col p-5">
      <h3 className="text-[13px] font-semibold text-ink">Who moved this season</h3>

      {figures.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink-secondary">
          Nobody has re-answered the discipleship question on a later night yet.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4">
            {figures.map((figure) => (
              <div key={figure.label} title={figure.title}>
                <div className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
                  {figure.value}
                </div>
                <div className="mt-1.5 text-[12px] text-ink-secondary">{figure.label}</div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-ink-secondary">
            Of the {report.everAnsweredTwice.toLocaleString()} who answered on two or more nights.
            Movement stays this small until the form re-asks returning players their status.
          </p>

          <Link
            href="/players?view=moved"
            className="mt-3 inline-flex items-center gap-1 self-start rounded-[5px] text-[12px] font-medium text-accent-ink underline decoration-accent/40 underline-offset-2 outline-none hover:decoration-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface pointer-coarse:min-h-11"
          >
            All {report.movers.length + report.uncertain} movers in Players
            <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden />
          </Link>
        </>
      )}
    </div>
  );
}
