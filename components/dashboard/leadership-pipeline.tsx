import { clsx } from "@/lib/clsx";
import type { LeadershipPipeline } from "@/lib/dashboard-metrics";

/**
 * Who says they are heading toward leading a group.
 *
 * The only forward-looking discipleship signal the roster holds. The status
 * questions describe where someone stands; this one describes where they are
 * going, and it had been sitting unread in `raw` since the first upload.
 *
 * Ordered least-ready to most-ready so the ramp darkens toward action and the
 * two actionable bands finish the list, where the eye stops. Reported over
 * the people who answered rather than the whole roster — unlike the funnel,
 * where the unrecorded gap *is* the finding, here a 681-strong "not asked"
 * band would bury the four bars that carry the decision.
 */
export function LeadershipPipelinePanel({ pipeline }: { pipeline: LeadershipPipeline }) {
  const { stages, answered, actionable } = pipeline;

  if (answered === 0) {
    return (
      <p className="px-5 py-4 text-[13px] text-ink-secondary">
        Nobody has answered the leadership question yet.
      </p>
    );
  }

  const widest = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="p-5">
      <div className="flex items-baseline gap-2">
        <span className="text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink">
          {actionable}
        </span>
        <span className="text-[13px] text-ink-secondary">
          ready or praying about it in the next three months
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {stages.map((stage, i) => (
          <li key={stage.label} className="flex items-center gap-3">
            <span
              className={clsx(
                "w-40 shrink-0 text-[12px]",
                stage.actionable ? "font-medium text-ink" : "text-ink-secondary",
              )}
            >
              {stage.label}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block h-4 rounded-[3px]"
                style={{
                  width: `${Math.max(1.5, (stage.count / widest) * 100)}%`,
                  backgroundColor: `var(--color-blue-${i + 2})`,
                }}
              />
            </span>
            <span className="w-20 shrink-0 text-right text-[12px] tabular-nums text-ink-secondary">
              <span className="font-medium text-ink">{stage.count}</span>{" "}
              <span className="text-ink-tertiary" aria-hidden>·</span>{" "}
              {Math.round((stage.count / answered) * 100)}%
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[12px] text-ink-secondary">
        Of {answered.toLocaleString()} who answered. Counts who says they are ready, not how many
        became ready this season.
      </p>
    </div>
  );
}
