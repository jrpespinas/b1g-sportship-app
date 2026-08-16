import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { getNightLedger } from "@/lib/game-nights";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function GameNightsPage() {
  const { nights, total, awaitingAttendance } = await getNightLedger();

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <header>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Game nights</h1>
          {/*
            The table below IS the ledger — this line is the only thing that
            reports on the backfill, and it disappears at zero rather than
            standing there reporting nothing.
          */}
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            {total === 0 ? (
              "No game nights yet — this fills in as soon as the first roster lands."
            ) : awaitingAttendance > 0 ? (
              <>
                <span className="font-semibold text-ink">{total}</span> nights ·{" "}
                <span className="font-semibold text-ink">{awaitingAttendance}</span> still need a check-in file.
                Registration says who signed up; attendance says who attended.
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">{total}</span> nights, every one with both a registration
                and a check-in file.
              </>
            )}
          </p>
        </header>

        {total === 0 ? (
          <Panel className="mt-5 flex h-[240px] items-center justify-center border-dashed p-5 text-center text-[13px] text-ink-secondary">
            Nothing to show yet. Upload a roster to get started.
          </Panel>
        ) : (
          <Panel className="mt-5">
            <PanelHeader
              icon={CalendarDays}
              title="The season"
              subtitle="Most recent first. A night with no check-in file shows no attendance — which is not the same as nobody coming."
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] table-fixed text-left text-[13px]">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[13%]" />
                  <col className="w-[16%]" />
                  <col className="w-[13%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="border-t border-border text-ink-secondary">
                    <th className="py-2 pl-5 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Registered</th>
                    <th className="py-2 pr-4 font-medium">Attended</th>
                    <th className="py-2 pr-4 font-medium">Show-up</th>
                    <th className="py-2 pr-4 font-medium">First-timers</th>
                    <th className="py-2 pr-4 font-medium">Sports</th>
                    <th className="py-2 pr-5 font-medium">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {nights.map((night) => (
                    <tr
                      key={night.gameNight.gameNightId}
                      className="border-t border-border align-top hover:bg-surface-subtle"
                    >
                      <td className="py-2.5 pl-5 pr-4">
                        <Link
                          href={`/game-nights/${night.gameNight.gameNightId}`}
                          className="rounded-[5px] font-medium text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                        >
                          {formatDate(night.gameNight.gameNightDate)}
                        </Link>
                        {/* An outlier that has a reason says the reason. */}
                        {night.anomaly && (
                          <div className="text-[12px] text-ink-secondary">{night.anomaly}</div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums text-ink">{night.registered}</td>
                      <td className="py-2.5 pr-4">
                        {night.attended != null ? (
                          <span className="tabular-nums text-ink">{night.attended}</span>
                        ) : (
                          // A row that cannot show a number offers the thing
                          // that would produce one.
                          <Link
                            href="/upload"
                            className="inline-flex items-center gap-1 rounded-[5px] text-[12px] font-medium text-accent-ink underline decoration-accent/40 underline-offset-2 outline-none hover:decoration-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                          >
                            Upload
                            <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden />
                          </Link>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        {night.showUpRate != null ? (
                          <span className="tabular-nums text-ink">{Math.round(night.showUpRate * 100)}%</span>
                        ) : (
                          <span className="text-ink-tertiary">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums text-ink-secondary">{night.firstTimers}</td>
                      <td className="py-2.5 pr-4 tabular-nums text-ink-secondary">{night.sports.length}</td>
                      <td className="py-2.5 pr-5 tabular-nums text-ink-secondary">
                        {night.gameNight.flaggedCount || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
