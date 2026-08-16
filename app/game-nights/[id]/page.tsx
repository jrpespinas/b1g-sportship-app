import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, Users } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { MetricPanel } from "@/components/dashboard/panel";
import { Badge } from "@/components/ui/badge";
import { getNightDetail } from "@/lib/game-nights";
import { formatName } from "@/lib/player-name";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function BackLink() {
  return (
    <Link
      href="/game-nights"
      className="inline-flex items-center gap-1.5 rounded-[5px] text-[13px] font-medium text-ink-secondary outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
    >
      <ArrowLeft className="size-3.5" strokeWidth={2} />
      Back to game nights
    </Link>
  );
}

export default async function GameNightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const night = await getNightDetail(id);

  if (!night) {
    return (
      <div className="min-h-screen bg-page">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
          <BackLink />
          <Panel className="mt-5 flex h-[200px] items-center justify-center border-dashed p-5 text-center text-[13px] text-ink-secondary">
            That game night doesn&apos;t exist. It may have been removed.
          </Panel>
        </div>
      </div>
    );
  }

  const hasAttendance = night.attended != null;
  const noShows = hasAttendance ? night.registered - night.attended! : undefined;
  const peakArrivals = Math.max(1, ...night.arrivals.map((a) => a.count));

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <BackLink />

        <header className="mt-4">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
            {formatDate(night.gameNight.gameNightDate)}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            {hasAttendance ? (
              <>
                <span className="font-semibold text-ink">{night.registered}</span> registered ·{" "}
                <span className="font-semibold text-ink">{night.attended}</span> attended ·{" "}
                <span className="font-semibold text-ink">{Math.round(night.showUpRate! * 100)}%</span> showed up.
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">{night.registered}</span> registered. No check-in file
                yet, so there is no attendance for this night — which is not the same as nobody coming.
              </>
            )}
            {night.anomaly ? ` ${night.anomaly.charAt(0).toUpperCase()}${night.anomaly.slice(1)}.` : ""}
          </p>
        </header>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricPanel label="Registered" value={night.registered} note="Signed up through the form." />
          <MetricPanel
            label="Attended"
            value={hasAttendance ? night.attended! : "—"}
            note={hasAttendance ? "Matched to the door check-in list." : "No check-in file uploaded yet."}
          />
          <MetricPanel
            label="Did not attend"
            value={noShows ?? "—"}
            accent={!!noShows}
            note={
              hasAttendance
                ? "Registered and did not check in. Counted only; follow-up tooling waits for more nights."
                : "Needs a check-in file before this can be known."
            }
          />
          <MetricPanel
            label="First-timers"
            value={night.firstTimers}
            note="First game night on record for these players."
          />
        </div>

        {night.arrivals.length > 0 && (
          <Panel className="mt-3">
            <PanelHeader
              icon={Clock}
              title="When people arrived"
              subtitle="Check-in times as recorded at the door, by the hour. Local time exactly as written."
            />
            <div className="space-y-2 p-5">
              {night.arrivals.map((bucket) => (
                <div key={bucket.hour} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-ink-secondary">
                    {bucket.label}
                  </span>
                  <span
                    className="h-3 rounded-r-[4px] bg-[var(--color-series-neutral)]"
                    style={{ width: `${Math.max(2, (bucket.count / peakArrivals) * 100)}%` }}
                  />
                  <span className="text-[12px] tabular-nums text-ink">{bucket.count}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
          <Panel>
            <PanelHeader icon={CalendarDays} title="Sports" />
            <ul className="p-5">
              {night.sports.map((s) => (
                <li key={s.sport} className="flex items-baseline justify-between py-1 text-[13px]">
                  <span className="text-ink">{s.sport}</span>
                  <span className="tabular-nums text-ink-secondary">{s.count}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader
              icon={Users}
              title="Who was on the list"
              subtitle={
                hasAttendance
                  ? "Everyone who registered, those who checked in first."
                  : "Everyone who registered. Attendance fills in once the check-in file is uploaded."
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead>
                  <tr className="border-t border-border text-ink-secondary">
                    <th className="py-2 pl-5 pr-4 font-medium">Player</th>
                    <th className="py-2 pr-4 font-medium">Sport</th>
                    <th className="py-2 pr-4 font-medium">Checked in</th>
                    <th className="py-2 pr-5 font-medium">First time?</th>
                  </tr>
                </thead>
                <tbody>
                  {night.roster.map(({ player, participation }) => (
                    <tr key={participation.participationId} className="border-t border-border">
                      <td className="py-2.5 pl-5 pr-4">
                        <Link
                          href={`/players/${player.playerId}`}
                          className="rounded-[5px] font-medium text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                        >
                          {formatName(player)}
                        </Link>
                        {!participation.registered && (
                          <div className="text-[12px] text-ink-secondary">attended without registering</div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-ink-secondary">
                        {participation.attendedSport ?? participation.sportSelected}
                      </td>
                      <td className="py-2.5 pr-4">
                        {participation.attendedAt ? (
                          <span className="tabular-nums text-ink">
                            {participation.attendedAt.slice(11, 16)}
                          </span>
                        ) : hasAttendance ? (
                          <span className="text-ink-secondary">did not attend</span>
                        ) : (
                          <span className="text-ink-tertiary">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-5">
                        {participation.isFirstParticipation ? <Badge tone="accent">First time</Badge> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
