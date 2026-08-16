import type { ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "ghost";
/** `sm` exists for the analyst register, whose whole character is 13px density. */
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const sizes: Record<Size, string> = {
  // A touch pointer gets a 44px floor on every size; a mouse keeps the
  // analyst register's compact controls untouched.
  md: "rounded-[10px] px-4 py-2.5 text-[15px] pointer-coarse:min-h-11",
  sm: "rounded-[8px] px-3 py-2 text-[13px] pointer-coarse:min-h-11",
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-ink hover:bg-accent-hover active:bg-accent-pressed shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
  secondary:
    "bg-surface text-ink border border-border-strong hover:bg-surface-subtle",
  ghost: "text-ink-secondary hover:text-ink hover:bg-surface-subtle",
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={clsx(base, sizes[size], variants[variant], className)} {...props} />;
}
