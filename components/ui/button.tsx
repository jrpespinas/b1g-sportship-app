import type { ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[15px] font-medium transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-ink hover:bg-accent-hover active:bg-accent-pressed shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
  secondary:
    "bg-surface text-ink border border-border-strong hover:bg-surface-subtle",
  ghost: "text-ink-secondary hover:text-ink hover:bg-surface-subtle",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={clsx(base, variants[variant], className)} {...props} />;
}
