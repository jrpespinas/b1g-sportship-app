import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { clsx } from "@/lib/clsx";

/**
 * The analyst-register container: a white panel on the grey page ground,
 * hairline border, no lift. Depth is carried by the ground/panel contrast
 * rather than by shadow, which is what lets panels sit shoulder-to-shoulder
 * at this density without the page reading as a pile of cards.
 */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx("rounded-xl border border-border bg-surface", className)}>{children}</div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export interface MetricSubStat {
  label: string;
  value: number | string;
  /** Square swatch tying this figure to its band in the charts below. */
  color?: string;
}

/**
 * A headline figure with its parts and a line of explanation.
 *
 * The explanation is not decoration: every figure here is read by someone
 * deciding who to talk to next, and a bare number invites the wrong read
 * (a mean that hides a tail, a subset mistaken for an addition).
 */
export function MetricPanel({
  label,
  value,
  subStats,
  note,
  href,
  hrefLabel,
  accent = false,
}: {
  label: string;
  value: number | string;
  subStats?: MetricSubStat[];
  note?: string;
  href?: string;
  hrefLabel?: string;
  accent?: boolean;
}) {
  return (
    <Panel className="flex flex-col p-5">
      <div className="text-[13px] font-medium text-ink-secondary">{label}</div>
      <div
        className={clsx(
          "mt-1.5 text-[34px] font-semibold leading-none tracking-[-0.02em]",
          accent ? "text-accent-ink" : "text-ink",
        )}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>

      {subStats && subStats.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {subStats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              {s.color ? (
                <span
                  className="inline-block size-2 shrink-0 translate-y-[-1px] rounded-[2px]"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
              ) : null}
              <span className="text-[15px] font-semibold tabular-nums text-ink">{s.value}</span>
              <span className="text-[12px] text-ink-secondary">{s.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {note ? <p className="mt-3 text-[12px] leading-relaxed text-ink-secondary">{note}</p> : null}

      {href ? (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 self-start rounded-[5px] text-[12px] font-medium text-accent-ink underline decoration-accent/40 underline-offset-2 outline-none hover:decoration-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {hrefLabel ?? "See the list"}
          <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden />
        </Link>
      ) : null}
    </Panel>
  );
}

/**
 * A single 100%-wide stacked bar. Used for "what is this sport's mix" where
 * the question is proportion, not volume — a full chart per sport would spend
 * far more space to answer a question one bar answers.
 */
export function SegmentMixBar({
  segments,
  total,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
}) {
  if (total === 0) return null;
  return (
    <div className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-surface-subtle">
      {segments.map((s) =>
        s.value === 0 ? null : (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
          />
        ),
      )}
    </div>
  );
}
