import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Panel, PanelHeader, MetricPanel } from "@/components/dashboard/panel";
import { TrendLineChart } from "@/components/charts/line-chart";
import { StackedAreaChart } from "@/components/charts/stacked-area-chart";
import { SportMixPanel } from "@/components/dashboard/sport-mix-panel";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { DGROUP_SEGMENTS, type DGroupSegment } from "@/lib/dgroup";
import {
  getDashboardData,
  getGenderBreakdown,
  getLatestGameNight,
  getLeadershipCapacity,
  getParticipantsForGameNight,
  getPointInTimeCoverage,
  getReturneeFirstTimerTimeSeries,
  getSegmentBreakdown,
  getSegmentMixBySport,
  getSegmentSeriesBySport,
  getSegmentTimeSeries,
  getTopReturningPlayers,
  getTotalUniqueParticipants,
} from "@/lib/dashboard-metrics";

// Reads live off the Sheet on every request — this dashboard has no cache to
// invalidate, per docs/spec/03-dashboard.md's on-demand refresh strategy.
export const dynamic = "force-dynamic";

const SEGMENT_COLOR: Record<DGroupSegment, string> = {
  Leaders: "var(--color-seg-leaders)",
  Members: "var(--color-seg-members)",
  Seekers: "var(--color-seg-seekers)",
  "Not involved": "var(--color-seg-uninvolved)",
};

// The directory's filter speaks the five-way category; these are the segments
// that map to it cleanly, so a figure only links out when the list behind it
// is genuinely the same set of people.
const SEGMENT_FILTER: Partial<Record<DGroupSegment, string>> = {
  Members: "DGroup Member",
  Seekers: "Seeking",
  "Not involved": "Not involved",
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const latestGameNight = getLatestGameNight(data);
  const totalUnique = getTotalUniqueParticipants(data);
  const gender = getGenderBreakdown(data);
  const genderOf = (g: string) => gender.find((x) => x.gender === g)?.count ?? 0;

  const segments = getSegmentBreakdown(data);
  const segmentOf = (s: DGroupSegment) => segments.find((x) => x.segment === s)?.count ?? 0;
  const capacity = getLeadershipCapacity(data);

  const returneeSeries = getReturneeFirstTimerTimeSeries(data);
  const segmentSeries = getSegmentTimeSeries(data);
  const sportSeries = getSegmentSeriesBySport(data);
  const sportMix = getSegmentMixBySport(data);
  const coverage = getPointInTimeCoverage(data);
  const topPlayers = getTopReturningPlayers(data, 12);

  const hasAnyGameNight = !!latestGameNight;
  const weeklyCount = latestGameNight
    ? getParticipantsForGameNight(data, latestGameNight.gameNightId).length
    : 0;

  const notInAGroup = segmentOf("Seekers") + segmentOf("Not involved");
  const uninvolvedShare = totalUnique > 0 ? Math.round((segmentOf("Not involved") / totalUnique) * 100) : 0;

  const bandsFor = (points: { counts: Record<DGroupSegment, number> }[]) =>
    DGROUP_SEGMENTS.map((segment) => ({
      key: segment,
      label: segment,
      color: SEGMENT_COLOR[segment],
      values: points.map((p) => p.counts[segment]),
    }));

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <header>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Discipleship health</h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-secondary">
            {hasAnyGameNight ? (
              <>
                <span className="font-semibold text-ink">{segmentOf("Not involved").toLocaleString()}</span> of{" "}
                {totalUnique.toLocaleString()} players — {uninvolvedShare}% — are in no group and have not asked to
                join one. Season to date, through {formatDate(latestGameNight!.gameNightDate)}.
              </>
            ) : (
              "No game nights uploaded yet — this fills in as soon as the first roster lands."
            )}
          </p>
        </header>

        {hasAnyGameNight && coverage.covered < coverage.nights && (
          <Panel className="mt-5 border-accent bg-accent-tint p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-ink" strokeWidth={2} aria-hidden />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink">
                  Segment history is inferred, not measured, for {coverage.nights - coverage.covered} of{" "}
                  {coverage.nights} game nights.
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
                  Those nights were uploaded before each night&apos;s own discipleship answers were kept, so the
                  charts below apply each player&apos;s <em>latest</em> status backwards. Someone who joined a group
                  in June therefore reads as a member in February too. Totals on this page are correct; the
                  per-night <em>shape</em> is an estimate until the past exports are re-uploaded.
                </p>
              </div>
            </div>
          </Panel>
        )}

        {!hasAnyGameNight ? (
          <Panel className="mt-6 flex h-[240px] items-center justify-center border-dashed p-5 text-center text-[14px] text-ink-secondary">
            Nothing to show yet. Upload this week&apos;s roster to get started.
          </Panel>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricPanel
                label="Unique participants"
                value={totalUnique}
                subStats={[
                  { label: "male", value: genderOf("Male") },
                  { label: "female", value: genderOf("Female") },
                  { label: "unspecified", value: genderOf("Unspecified") },
                ]}
                note={`Everyone who has attended at least once. ${weeklyCount} came on ${formatDate(
                  latestGameNight!.gameNightDate,
                )}.`}
              />
              <MetricPanel
                label="DGroup leaders"
                value={capacity.leaders}
                subStats={[
                  { label: "DLeaders", value: capacity.dgroupLeaders },
                  { label: "D12", value: capacity.d12 },
                ]}
                note={`${capacity.willingToAbsorb} of them said they are willing to absorb new members.`}
              />
              <MetricPanel
                label="DGroup members"
                value={segmentOf("Members")}
                subStats={[{ label: "of all players", value: `${Math.round((segmentOf("Members") / totalUnique) * 100)}%` }]}
                note="In a group but not leading one — the pool to invite into leadership."
                href={`/players?dgroup=${encodeURIComponent(SEGMENT_FILTER.Members!)}`}
                hrefLabel="Who they are"
              />
              <MetricPanel
                label="Not in a group"
                value={notInAGroup}
                subStats={[
                  { label: "seeking", value: segmentOf("Seekers"), color: SEGMENT_COLOR.Seekers },
                  { label: "not involved", value: segmentOf("Not involved"), color: SEGMENT_COLOR["Not involved"] },
                ]}
                note="Seekers raised their hand. The rest have not been asked."
                href={`/players?dgroup=${encodeURIComponent(SEGMENT_FILTER["Not involved"]!)}`}
                hrefLabel="Who has not been asked"
              />
            </div>

            {/* The matching market — the one number that says where the work is. */}
            <Panel className="mt-3">
              <PanelHeader
                title="Placing seekers"
                subtitle="Seekers are people asking for a group. Capacity is leaders who said they can take someone."
              />
              <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[auto_1fr]">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-[12px] font-medium text-ink-secondary">Seeking</div>
                    <div className="mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink">
                      {capacity.seekers}
                    </div>
                    <Link
                      href={`/players?dgroup=${encodeURIComponent(SEGMENT_FILTER.Seekers!)}`}
                      className="mt-2 inline-flex items-center gap-1 rounded-[5px] text-[12px] font-medium text-accent-ink underline decoration-accent/40 underline-offset-2 outline-none hover:decoration-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      Match them
                      <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden />
                    </Link>
                  </div>
                  <div className="text-[20px] text-ink-secondary" aria-hidden>
                    ↔
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-ink-secondary">Willing to absorb</div>
                    <div className="mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink">
                      {capacity.willingToAbsorb}
                    </div>
                    <div className="mt-2 text-[12px] text-ink-secondary">
                      of {capacity.leaders} leaders
                    </div>
                  </div>
                </div>

                <div className="flex items-center border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <p className="text-[13px] leading-relaxed text-ink-secondary">
                    {capacity.surplus > 0 ? (
                      <>
                        There is room for{" "}
                        <span className="font-semibold text-ink">{capacity.surplus} more</span> seekers than are
                        currently asking. Capacity is not the constraint — the{" "}
                        <span className="font-semibold text-ink">{segmentOf("Not involved").toLocaleString()}</span>{" "}
                        players who have not asked at all are. Every one of them is a conversation nobody has had
                        yet.
                      </>
                    ) : capacity.surplus < 0 ? (
                      <>
                        Seekers outnumber available leaders by{" "}
                        <span className="font-semibold text-ink">{Math.abs(capacity.surplus)}</span>. Growing
                        leaders is the constraint — start with the{" "}
                        <span className="font-semibold text-ink">{segmentOf("Members").toLocaleString()}</span>{" "}
                        members already in a group.
                      </>
                    ) : (
                      <>Seekers and available leaders are exactly matched at {capacity.seekers}.</>
                    )}
                  </p>
                </div>
              </div>
            </Panel>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Panel>
                <PanelHeader
                  title="Who is showing up"
                  subtitle="Returnees against first-timers, every game night this season."
                />
                <div className="p-5">
                  <TrendLineChart
                    categories={returneeSeries.map((s) => s.gameNightId)}
                    categoryLabels={returneeSeries.map((s) => formatDate(s.date))}
                    series={[
                      {
                        key: "returnees",
                        label: "Returnees",
                        color: "var(--color-series-returnee)",
                        values: returneeSeries.map((s) => s.returnees),
                      },
                      {
                        key: "firstTimers",
                        label: "First-timers",
                        color: "var(--color-series-firsttimer)",
                        values: returneeSeries.map((s) => s.firstTimers),
                      },
                    ]}
                  />
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Discipleship mix of attendance"
                  subtitle="Where the room sits on the pipeline, night by night. Darker is deeper involvement."
                />
                <div className="p-5">
                  <StackedAreaChart
                    title="Discipleship segments per game night"
                    categoryLabel="Game night"
                    categories={segmentSeries.map((s) => s.gameNightId)}
                    categoryLabels={segmentSeries.map((s) => formatDate(s.date))}
                    bands={bandsFor(segmentSeries)}
                  />
                </div>
              </Panel>
            </div>

            <SportMixPanel
              segmentColor={SEGMENT_COLOR}
              facets={sportSeries.map((s) => ({
                sport: s.sport,
                total: s.total,
                allTimeCounts:
                  sportMix.find((m) => m.sport === s.sport)?.counts ??
                  (Object.fromEntries(DGROUP_SEGMENTS.map((seg) => [seg, 0])) as Record<DGroupSegment, number>),
                points: s.points.map((p) => ({
                  gameNightId: p.gameNightId,
                  label: formatDate(p.date),
                  counts: p.counts,
                })),
              }))}
            />

            <Panel className="mt-3">
              <PanelHeader
                title="Most committed players"
                subtitle="Ranked by nights attended. The ones showing up most who are still in no group are the warmest conversations available."
                action={
                  <Link
                    href="/players"
                    className="inline-flex items-center gap-1 rounded-[5px] text-[12px] font-medium text-accent-ink underline decoration-accent/40 underline-offset-2 outline-none hover:decoration-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    All players
                    <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden />
                  </Link>
                }
              />
              <Leaderboard players={topPlayers} />
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
