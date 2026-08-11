import type { HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { clsx } from "@/lib/clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}

export interface Delta {
  value: number;
  /** Appended to the accessible label, e.g. "from the previous game night". */
  compareLabel: string;
  /**
   * Deltas smaller than this magnitude render neutral (no arrow, no color)
   * instead of up/down — routine noise shouldn't read as a signal. Omit for
   * metrics where any nonzero change is meaningful (e.g. counts that can
   * only grow).
   */
  neutralThreshold?: number;
}

export function DeltaIndicator({ value, compareLabel, neutralThreshold = 0 }: Delta) {
  const direction =
    value === 0 ? "flat" : Math.abs(value) < neutralThreshold ? "insignificant" : value > 0 ? "up" : "down";
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : null;
  const text = direction === "flat" ? "No change" : `${value > 0 ? "+" : ""}${value}`;
  const ariaLabel =
    direction === "flat"
      ? `No change ${compareLabel}`
      : direction === "insignificant"
        ? `${value > 0 ? "up" : "down"} ${Math.abs(value)} ${compareLabel}, within the typical range`
        : `${direction} ${Math.abs(value)} ${compareLabel}`;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 text-[13px] font-medium",
        direction === "up" && "text-success",
        direction === "down" && "text-danger",
        (direction === "flat" || direction === "insignificant") && "text-ink-secondary",
      )}
      aria-label={ariaLabel}
    >
      {Icon ? <Icon size={12} strokeWidth={2.5} aria-hidden="true" /> : null}
      {text}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sublabel,
  accent = false,
  icon: Icon,
  delta,
  className,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: boolean;
  icon?: LucideIcon;
  delta?: Delta;
  className?: string;
}) {
  return (
    <Card className={clsx("flex h-full flex-col justify-center p-5", className)}>
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span
            className={clsx(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              accent ? "bg-accent-tint text-accent-ink" : "bg-surface-subtle text-ink-secondary",
            )}
          >
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
          </span>
        ) : null}
        <div className="text-[13px] font-medium text-ink-secondary">{label}</div>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className={clsx("text-[28px] font-semibold leading-none", accent ? "text-accent-ink" : "text-ink")}>
          {value}
        </span>
        {delta ? <DeltaIndicator {...delta} /> : null}
      </div>
      {sublabel ? <div className="mt-1.5 text-[13px] text-ink-secondary">{sublabel}</div> : null}
    </Card>
  );
}

export function GroupedStatCard({
  label,
  value,
  icon: Icon,
  delta,
  subStats,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delta?: Delta;
  subStats: { label: string; value: string | number; definition?: string }[];
  className?: string;
}) {
  return (
    <Card className={clsx("flex h-full flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5", className)}>
      <div className="flex flex-1 flex-col justify-center">
        <div className="flex items-center gap-2.5">
          {Icon ? (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-ink-secondary">
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
            </span>
          ) : null}
          <div className="text-[13px] font-medium text-ink-secondary">{label}</div>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[28px] font-semibold leading-none text-ink">{value}</span>
          {delta ? <DeltaIndicator {...delta} /> : null}
        </div>
      </div>
      <div className="h-px w-full shrink-0 bg-border sm:h-auto sm:w-px sm:self-stretch" aria-hidden="true" />
      <div className="flex shrink-0 gap-5 sm:flex-col sm:justify-center sm:gap-3">
        {subStats.map((stat) => (
          <div key={stat.label}>
            <div className="text-[19px] font-semibold leading-none text-ink">{stat.value}</div>
            <div className="mt-1 text-[13px] text-ink-secondary">
              {stat.definition ? (
                <span
                  title={stat.definition}
                  aria-label={`${stat.label} — ${stat.definition}`}
                  className="cursor-help underline decoration-ink-tertiary decoration-dotted underline-offset-2"
                >
                  {stat.label}
                </span>
              ) : (
                stat.label
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
