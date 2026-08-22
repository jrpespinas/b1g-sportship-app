import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

export type SortDirection = "asc" | "desc";

/**
 * The affordance that says a column header is a control.
 *
 * Shared by the player worklist and the night roster so the two sortable
 * tables in this app cannot drift into two different ways of showing the same
 * state. Inactive columns still show the double chevron — a header that only
 * reveals it is sortable once you have already sorted it is not an affordance.
 */
export function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ChevronsUpDown size={13} strokeWidth={2} className="text-ink-tertiary" />;
  return direction === "asc" ? (
    <ChevronUp size={13} strokeWidth={2} className="text-ink" />
  ) : (
    <ChevronDown size={13} strokeWidth={2} className="text-ink" />
  );
}
