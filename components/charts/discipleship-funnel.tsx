import Link from "next/link";
import { clsx } from "@/lib/clsx";
import type { FunnelStage } from "@/lib/dashboard-metrics";

/**
 * Where the whole roster stands, one bar per stage.
 *
 * Not a tapering funnel shape. A funnel's narrowing silhouette asserts that
 * everyone flows through the stages in order, and nobody here does — a
 * DGroup member did not first pass through "seeking", and the largest stage
 * is a data gap that is not a position at all. Proportional bars on a shared
 * scale carry the same magnitudes without the false claim.
 *
 * "Not recorded" is drawn first, in a hatched neutral, and is the point of
 * the chart as much as any real stage: it is a third of the roster the
 * ministry cannot currently see.
 */
export function DiscipleshipFunnel({
  stages,
  hrefFor,
}: {
  stages: FunnelStage[];
  hrefFor?: (stage: FunnelStage) => string | undefined;
}) {
  const total = stages.reduce((sum, s) => sum + s.count, 0);
  const widest = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="p-5">
      <ul className="space-y-2.5">
        {stages.map((stage, i) => {
          const href = hrefFor?.(stage);
          const share = total > 0 ? stage.count / total : 0;
          const label = (
            <>
              <span className="w-32 shrink-0 text-[12px] text-ink">{stage.label}</span>
              <span className="min-w-0 flex-1">
                <span
                  className={clsx(
                    "block h-4 rounded-[3px]",
                    stage.unrecorded && "bg-[repeating-linear-gradient(135deg,var(--color-border-strong)_0_3px,var(--color-surface-subtle)_3px_7px)]",
                  )}
                  style={{
                    width: `${Math.max(1.5, (stage.count / widest) * 100)}%`,
                    // Deeper involvement reads darker: the ramp is the
                    // sequence, so the bars encode position as well as size.
                    backgroundColor: stage.unrecorded ? undefined : `var(--color-blue-${Math.min(6, i + 1)})`,
                  }}
                />
              </span>
              <span className="w-24 shrink-0 text-right text-[12px] tabular-nums text-ink-secondary">
                <span className="font-medium text-ink">{stage.count.toLocaleString()}</span>{" "}
                <span className="text-ink-tertiary" aria-hidden>·</span> {Math.round(share * 100)}%
              </span>
            </>
          );

          return (
            <li key={stage.label}>
              {href ? (
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-[5px] outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface pointer-coarse:min-h-11"
                >
                  {label}
                </Link>
              ) : (
                <div className="flex items-center gap-3">{label}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
