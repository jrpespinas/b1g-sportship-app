import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "@/lib/clsx";

/**
 * The analyst-register container: a white panel on the grey page ground,
 * hairline border, no lift. Depth is carried by the ground/panel contrast
 * rather than by shadow, which is what lets panels sit shoulder-to-shoulder
 * at this density without the page reading as a pile of cards.
 *
 * Lives in ui/ rather than dashboard/ because the register now governs more
 * than one surface — see DESIGN.md, "The Analyst Register".
 */
export function Panel({
  className,
  emphasis = false,
  children,
}: {
  className?: string;
  /**
   * Rings the panel in accent, for the one panel on a screen that carries the
   * answer — the placement gap, the near-certain duplicate candidate.
   *
   * A prop rather than `className="border-accent"`, which is what four call
   * sites used to do and none of them worked: both are `border-color`
   * utilities, so the winner is whichever Tailwind emits later in the
   * stylesheet, not whichever the caller passes last. Resolving it here means
   * one class is emitted and the conflict cannot arise.
   */
  emphasis?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-surface",
        emphasis ? "border-accent" : "border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  /**
   * Named sections only. A panel that repeats — the 40 seeker panels on
   * /match, whose titles are people's names — stays bare: a person is not a
   * category, and forty identical icons are texture rather than wayfinding.
   * Sits in `ink-secondary` so it never competes with the title beside it.
   */
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {Icon ? <Icon className="size-4 shrink-0 text-ink-secondary" strokeWidth={2} aria-hidden /> : null}
          {title}
        </h2>
        {subtitle ? <div className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{subtitle}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
