import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { MetricPanel } from "@/components/dashboard/panel";
import { getNightDetail } from "@/lib/game-nights";
import { formatName } from "@/lib/player-name";
import { NightRoster } from "@/components/game-nights/night-roster";

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

          {/* Projected to four columns before it crosses to the client:
              `Player.raw` is the whole 80-column form response, and a night
              holds up to 180 of them. */}
          <NightRoster
            hasAttendance={hasAttendance}
            rows={night.roster.map(({ player, participation }) => ({
              playerId: player.playerId,
              name: formatName(player),
              sport: participation.attendedSport ?? participation.sportSelected,
              // The hour as written at the door. Never timezone-converted —
              // read as UTC a 5:33pm arrival becomes 1:33am the next day.
              arrivedAt: participation.attendedAt ? participation.attendedAt.slice(11, 16) : undefined,
              registered: participation.registered,
              firstTime: participation.isFirstParticipation,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
