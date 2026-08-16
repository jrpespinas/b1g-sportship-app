"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ListOrdered } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { clsx } from "@/lib/clsx";
import { getSegmentTone, isUnplaced } from "@/lib/dgroup";
import type { RosterRow, RosterViews } from "@/lib/dashboard-metrics";

/**
 * One table, three views, switched in place.
 *
 * Three panels would be the same table printed three times: the columns are
 * identical and only the ranking and the filter change. Switching in place
 * also puts the three readings of the same roster into direct comparison —
 * the regulars, the people who sign up and do not come, and the regulars
 * nobody has placed — which is the comparison the ministry acts on.
 *
 * Every view is restricted to nights with a check-in file, and says so.
 */
type ViewId = "returning" | "noShows" | "unplaced";

const VIEWS: { id: ViewId; label: string; rank: string }[] = [
  { id: "returning", label: "Returning players", rank: "Nights attended" },
  { id: "noShows", label: "No-shows", rank: "Nights missed" },
  { id: "unplaced", label: "Returning but unplaced", rank: "Nights attended" },
];

export function RosterTable({ views }: { views: RosterViews }) {
  const [view, setView] = useState<ViewId>("returning");
  const active = VIEWS.find((v) => v.id === view)!;
  const rows = views[view];

  return (
    <Panel className="mt-3">
      <PanelHeader
        title="Who keeps coming, and who does not"
        icon={ListOrdered}
        subtitle={`${views.nightsWithFile} of ${views.totalNights} nights`}
        action={
          <div
            className="flex flex-wrap rounded-[7px] border border-border-strong p-0.5"
            role="group"
            aria-label="Roster view"
          >
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                className={clsx(
                  "rounded-[5px] px-2 py-1 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface pointer-coarse:min-h-11 pointer-coarse:px-3",
                  view === v.id ? "bg-surface-subtle text-ink" : "text-ink-secondary hover:text-ink",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        }
      />

      {rows.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-ink-secondary">
          Nothing to show here yet — this fills in once a check-in file is uploaded.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-t border-border text-ink-secondary">
                <th scope="col" className="w-10 py-2 pl-5 font-medium">#</th>
                <th scope="col" className="py-2 pr-4 font-medium">Player</th>
                <th scope="col" className="py-2 pr-4 font-medium">{active.rank}</th>
                <th scope="col" className="py-2 pr-4 font-medium">Registered</th>
                <th scope="col" className="py-2 pr-4 font-medium">DGroup involvement</th>
                <th scope="col" className="py-2 pr-5 font-medium">Frequent sport</th>
              </tr>
            </thead>
            {/* The switch swaps all twelve rows at once. Without this a
                screen-reader user hears the button state change and
                nothing else — the table silently becomes a different
                list. `polite` because it follows a deliberate action. */}
            <tbody aria-live="polite" aria-relevant="all">
              {rows.map((row, i) => (
                <Row key={row.playerId} row={row} rank={i + 1} view={view} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Row({ row, rank, view }: { row: RosterRow; rank: number; view: ViewId }) {
  // Marked, not filtered out. The finding on the returning view is the
  // juxtaposition: the person who has come more often than anyone in the
  // ministry is still in no group, and two separate panels would bury it.
  const unplaced = isUnplaced(row.segment);
  const highlight = view === "returning" && unplaced;

  return (
    <tr className={clsx("border-t border-border", highlight && "bg-accent-tint/40")}>
      <td className="py-2.5 pl-5 tabular-nums text-ink-secondary">{rank}</td>
      <td className="py-2.5 pr-4">
        <Link
          href={`/players/${row.playerId}`}
          className="inline-flex items-center rounded-[5px] font-medium text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface pointer-coarse:min-h-11"
        >
          {row.name}
        </Link>
        {/* A total zero is either a real pattern or a name the door list never
            resolved. The data cannot tell those apart, so the row says so
            rather than asserting a no-show. Anyone with one recorded arrival
            has proven their name matches, so only a total zero is flagged. */}
        {view === "noShows" && row.unmatchedName && (
          <span
            className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] font-medium text-accent-ink"
            title="No arrival ever recorded — this may be a name the check-in list never matched, not a no-show."
          >
            <AlertTriangle className="size-3" strokeWidth={2} aria-hidden />
            never matched?
          </span>
        )}
      </td>
      <td className="py-2.5 pr-4 tabular-nums text-ink">
        {view === "noShows" ? row.missed : row.nightsAttended}
      </td>
      <td className="py-2.5 pr-4 tabular-nums text-ink-secondary">{row.registrations}</td>
      <td className="py-2.5 pr-4">
        <Badge tone={getSegmentTone(row.segment)}>{row.segment}</Badge>
      </td>
      <td className="py-2.5 pr-5 text-ink-secondary">{row.frequentSport ?? "—"}</td>
    </tr>
  );
}
