import type { ReactNode } from "react";
import { Check, Minus, X } from "lucide-react";
import { clsx } from "@/lib/clsx";

/**
 * One line of evidence on a review card.
 *
 * Three states, not two: a signal that is *unknown* — no phone on either side
 * — must not read as a signal that failed. Collapsing the two would let a
 * blank field argue that two records are different people, which is the one
 * mistake a dedup queue cannot afford.
 *
 * Met reads in success ink, failed in danger, unknown stays quiet. Shared by
 * the registration and attendance queues so there is one way to read evidence
 * in this app.
 */
export type SignalState = "met" | "failed" | "unknown";

const ICONS = { met: Check, failed: X, unknown: Minus } as const;

const TONES = {
  met: { icon: "text-success", text: "text-ink" },
  failed: { icon: "text-danger", text: "text-ink" },
  unknown: { icon: "text-ink-tertiary", text: "text-ink-secondary" },
} as const;

export function Signal({ state, children }: { state: SignalState; children: ReactNode }) {
  const Icon = ICONS[state];
  const tone = TONES[state];
  return (
    <li className="flex items-baseline gap-1.5 text-[12px]">
      <Icon
        className={clsx("size-3 shrink-0 translate-y-[2px]", tone.icon)}
        strokeWidth={state === "met" ? 3 : 2}
        aria-hidden
      />
      <span className={tone.text}>{children}</span>
    </li>
  );
}

export function SignalList({ children }: { children: ReactNode }) {
  return <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">{children}</ul>;
}
