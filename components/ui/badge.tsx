import type { HTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Tone = "neutral" | "accent" | "success";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-subtle text-ink-secondary",
  accent: "bg-accent-tint text-accent-ink",
  success: "bg-success-tint text-success",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium leading-none",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
