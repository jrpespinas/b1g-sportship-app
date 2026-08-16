import { Mars, Venus } from "lucide-react";
import { clsx } from "@/lib/clsx";

/**
 * Mars/Venus at text scale, **inheriting ink — never coloured**. Colouring
 * gender would add two semantic hues, collide with the One-Voice Rule, and
 * demand palette validation for a distinction the shape already carries.
 *
 * Used only where getting the split wrong has a cost: the match pool line,
 * the dashboard capacity split, and the player detail field. Deliberately not
 * beside the dashboard's `569 male` substats, where an icon would restate its
 * own label rather than distinguish anything.
 *
 * `aria-hidden` throughout: the word is always present next to it, so the
 * mark is reinforcement and never the only carrier of meaning.
 */
export function GenderMark({ gender, className }: { gender?: string; className?: string }) {
  const value = (gender ?? "").trim().toLowerCase();
  const Icon = value === "male" ? Mars : value === "female" ? Venus : null;
  if (!Icon) return null;

  return (
    <Icon
      className={clsx("inline-block size-3.5 shrink-0 translate-y-[2px]", className)}
      strokeWidth={2}
      aria-hidden
    />
  );
}
