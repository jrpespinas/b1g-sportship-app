import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { clsx } from "@/lib/clsx";
import type { DGroupSegment } from "@/lib/dgroup";
import type { TopReturningPlayer } from "@/lib/dashboard-metrics";
import { formatName } from "@/lib/player-name";

// Tone follows what the row asks someone to DO, not how "good" it is:
// accent marks the rows worth acting on. A regular attender in no group is
// the warmest conversation on the page, so it earns the attention colour —
// leaders and members are already placed, so they stay quiet.
function segmentTone(segment: DGroupSegment): "success" | "accent" | "neutral" {
  if (segment === "Seekers" || segment === "Not involved") return "accent";
  if (segment === "Leaders" || segment === "Members") return "success";
  return "neutral";
}

export function Leaderboard({ players }: { players: TopReturningPlayer[] }) {
  if (players.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center p-5 text-[13px] text-ink-secondary">
        No returning players yet — check back after a second game night.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-ink-secondary">
              <th className="w-10 py-2.5 pl-5 font-medium">#</th>
              <th className="py-2.5 font-medium">Player</th>
              <th className="py-2.5 font-medium tabular-nums">Nights</th>
              <th className="py-2.5 font-medium">DGroup involvement</th>
              <th className="py-2.5 pr-5 font-medium">Frequent sport</th>
            </tr>
          </thead>
          <tbody>
            {players.map((row, i) => {
              const isLast = i === players.length - 1;
              const needsConversation = row.segment === "Not involved" || row.segment === "Seekers";
              return (
                <tr
                  key={row.player.playerId}
                  className={clsx("border-b border-border last:border-0 hover:bg-surface-subtle")}
                >
                  <td className={clsx("py-2.5 pl-5 tabular-nums text-ink-secondary", isLast && "pb-4")}>{i + 1}</td>
                  <td className={clsx("whitespace-nowrap py-2.5", isLast && "pb-4")}>
                    <Link
                      href={`/players/${row.player.playerId}`}
                      className="rounded-[5px] font-medium text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      {formatName(row.player)}
                    </Link>
                  </td>
                  <td className={clsx("py-2.5 tabular-nums text-ink", isLast && "pb-4")}>{row.gameNightCount}</td>
                  <td className={clsx("py-2.5", isLast && "pb-4")}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={segmentTone(row.segment)}>{row.segment}</Badge>
                      {row.willingToAbsorb && <Badge tone="success">Can absorb</Badge>}
                      {needsConversation && (
                        <span className="text-[12px] text-ink-secondary">
                          {row.gameNightCount} nights, never placed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={clsx("py-2.5 pr-5", isLast && "pb-4")}>
                    <div className="flex flex-wrap gap-1.5">
                      {row.frequentSports.map((sport) => (
                        <Badge key={sport} tone="neutral">
                          {sport}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-surface sm:hidden"
        aria-hidden
      />
    </div>
  );
}
