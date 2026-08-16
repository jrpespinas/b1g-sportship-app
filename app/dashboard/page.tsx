import {
  AlertTriangle,
  Layers,
  Sprout,
} from "lucide-react";
import { Panel, PanelHeader, MetricPanel } from "@/components/dashboard/panel";
import { WhoRegisters } from "@/components/dashboard/who-registers";
import { LeadershipPipelinePanel } from "@/components/dashboard/leadership-pipeline";
import { MatchingMarketPanel } from "@/components/dashboard/matching-market";
import { MoversList } from "@/components/dashboard/movers-list";
import { RosterTable } from "@/components/dashboard/roster-table";
import { SupplyDemandPanel } from "@/components/dashboard/supply-demand-panel";
import { DiscipleshipFunnel } from "@/components/charts/discipleship-funnel";
import { SportMixPanel } from "@/components/dashboard/sport-mix-panel";
import { ShowUpBySportPanel } from "@/components/dashboard/show-up-by-sport-panel";
import type { DGroupSegment } from "@/lib/dgroup";
import { formatDate, formatDateWithYear } from "@/lib/format-date";
import { getSupplyDemand } from "@/lib/supply-demand";
import {
  getDashboardData,
  getLatestGameNight,
  getAttendanceScale,
  getCaptureGaps,
  getRegistrationDemographics,
  getLeadershipPipeline,
  getGenderBreakdown,
  getMatchingMarket,
  getMovers,
  getParticipantsForGameNight,
  getPointInTimeCoverage,
  getDiscipleshipFunnel,
  getLeadershipCapacity,
  getRosterViews,
  getSegmentBreakdown,
  getSegmentMixBySport,
  getSegmentSeriesBySport,
  getShowUpSeriesBySport,
  getTotalUniqueParticipants,
  type FunnelStage,
} from "@/lib/dashboard-metrics";

// Rendered per request, but the Sheets reads behind it are cached for five
// minutes and dropped on upload (`lib/sheets.ts`). That is the spec's
// "on-demand refresh or a coarse periodic revalidation" read literally: the
// page is never stale after a write, and a burst of views costs one
// round-trip instead of one each.
export const dynamic = "force-dynamic";

/**
 * Blue for depth of involvement, orange for the two ends that are not a
 * position — nobody recorded, and nobody involved. Both ramps run in the same
 * direction as the funnel itself.
 */
const SEGMENT_COLOR: Record<DGroupSegment, string> = {
  Leaders: "var(--color-blue-6)",
  Members: "var(--color-blue-4)",
  Seekers: "var(--color-seg-seekers)",
  "Not involved": "var(--color-seg-uninvolved)",
  "Not recorded": "var(--color-seg-unrecorded)",
};

const segmentHref = (segment: DGroupSegment) => `/players?segment=${encodeURIComponent(segment)}`;

/**
 * Every stage links to exactly the people it counted, by category rather than
 * by segment — "Leaders" spans two stages, so a row reading "D12 · 53" would
 * otherwise land on 187 names. The unrecorded stage links too: those 72 are
 * the most actionable list on the page, because the follow-up is simply to go
 * and ask them.
 */
const funnelHref = (stage: FunnelStage) =>
  `/players?category=${encodeURIComponent(stage.category)}`;

/**
 * One panel per question, season-to-date.
 *
 * The page is a view, not a report: findings live in the marks and in the
 * chips beside them, never in a paragraph. Each panel carries its title plus
 * at most a short unit or population label — and only where its absence would
 * let a figure be read as something it is not.
 */
export default async function DashboardPage() {
  const data = await getDashboardData();

  const latestGameNight = getLatestGameNight(data);
  const totalUnique = getTotalUniqueParticipants(data);
  const segments = getSegmentBreakdown(data);
  const segmentOf = (s: DGroupSegment) => segments.find((x) => x.segment === s)?.count ?? 0;

  const capacity = getLeadershipCapacity(data);
  const scale = getAttendanceScale(data);
  const captureGaps = getCaptureGaps(data);
  const coverage = getPointInTimeCoverage(data);

  // The season's own year, so an age never shifts because the page was
  // opened in January.
  const seasonYear = Number(latestGameNight?.gameNightDate.slice(0, 4)) || new Date().getFullYear();
  const demographics = getRegistrationDemographics(data, seasonYear);
  const pipeline = getLeadershipPipeline(data);
  const funnel = getDiscipleshipFunnel(data);
  const market = getMatchingMarket(data);
  const movement = getMovers(data);
  const supplyDemand = getSupplyDemand(data.players);
  const roster = getRosterViews(data);

  const showUpBySport = getShowUpSeriesBySport(data);
  const sportSeries = getSegmentSeriesBySport(data);
  const sportMix = getSegmentMixBySport(data);

  const genderStats = getGenderBreakdown(data)
    .sort((a, b) => b.count - a.count)
    .map((g) => ({ label: g.gender.toLowerCase(), value: g.count }));
  const weeklyCount = latestGameNight
    ? getParticipantsForGameNight(data, latestGameNight.gameNightId).length
    : 0;

  const hasAnyGameNight = !!latestGameNight;
  const hasAttendance = scale.nightsWithFile > 0;
  // Everyone the ministry has not placed, however they got there: asked and
  // seeking, asked and declined, or never asked at all.
  const unplaced =
    segmentOf("Seekers") + segmentOf("Not involved") + segmentOf("Not recorded");
  const unrecorded = funnel.find((s) => s.unrecorded)?.count ?? 0;

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">Discipleship Overview</h1>
          <p className="text-[13px] text-ink-secondary">
            {hasAnyGameNight
              ? `${scale.totalNights} game nights · through ${formatDateWithYear(latestGameNight!.gameNightDate)}`
              : "No game nights uploaded yet"}
          </p>
        </header>

        {hasAnyGameNight && captureGaps.length > 0 && (
          <Panel emphasis className="mt-5 bg-accent-tint p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-ink" strokeWidth={2} aria-hidden />
              <div className="min-w-0 text-[13px]">
                <span className="font-semibold text-ink">
                  No discipleship answers captured for {captureGaps.length}{" "}
                  {captureGaps.length === 1 ? "night" : "nights"}
                </span>
                <span className="text-ink-secondary">
                  {" "}
                  — {captureGaps.map((g) => formatDate(g.date)).join(", ")}. Re-upload those exports to fix.
                </span>
              </div>
            </div>
          </Panel>
        )}

        {!hasAnyGameNight ? (
          <Panel className="mt-6 flex h-[240px] items-center justify-center border-dashed p-5 text-center text-[13px] text-ink-secondary">
            Nothing to show yet. Upload this week&apos;s roster to get started.
          </Panel>
        ) : (
          <>
            {/* ── Where people stand ──────────────────────────────────
                Four wide panels rather than six narrow ones. Each headline
                carries the parts that make it up, so a figure can be checked
                against its own composition without leaving the tile — a bare
                number invites the wrong read, and these are read by someone
                deciding who to talk to next.

                Ordered placement-first as of 2026-08-16. The two discipleship
                figures lead because they are the page's question; roster size
                is the denominator they are read against, and attendance is the
                organiser's number, so it trails rather than opens. */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricPanel
                label="Not in a group"
                value={unplaced}
                subStats={[
                  { label: "seeking", value: segmentOf("Seekers"), color: SEGMENT_COLOR.Seekers },
                  {
                    label: "asked, not involved",
                    value: segmentOf("Not involved"),
                    color: SEGMENT_COLOR["Not involved"],
                  },
                  {
                    label: "never asked",
                    value: segmentOf("Not recorded"),
                    color: SEGMENT_COLOR["Not recorded"],
                  },
                ]}
                note="Seekers asked for a group. The rest either declined or were never asked — a different follow-up each."
                href={segmentHref("Not recorded")}
                hrefLabel="Who has never been asked"
              />


              <MetricPanel
                label="Discipleship group leaders"
                value={capacity.leaders}
                subStats={[
                  { label: "lead a group", value: capacity.dgroupLeaders },
                  { label: "D12 — lead leaders", value: capacity.d12 },
                ]}
                note={`${capacity.willingToAbsorb} of them said they are willing to absorb new members.`}
                href={segmentHref("Leaders")}
                hrefLabel="Who they are"
              />


              <MetricPanel
                label="Unique participants"
                value={totalUnique}
                subStats={genderStats}
                note={
                  hasAnyGameNight
                    ? `Everyone who has registered at least once. ${weeklyCount} registered for ${formatDate(latestGameNight!.gameNightDate)}.`
                    : undefined
                }
                href="/players"
                hrefLabel="Player directory"
              />


              <MetricPanel
                label={hasAttendance ? "Attended at least once" : "Registered at least once"}
                value={hasAttendance ? scale.uniqueCame : scale.uniqueRegistered}
                subStats={
                  hasAttendance
                    ? [
                        { label: "typical night", value: scale.typicalNight },
                        { label: "show-up rate", value: `${Math.round(scale.showUpRate * 100)}%` },
                      ]
                    : undefined
                }
                note={
                  hasAttendance
                    ? `${scale.neverCame} registered at some point and never once walked in. Covers the ${scale.nightsWithFile} of ${scale.totalNights} nights with a check-in file.`
                    : undefined
                }
              />

            </div>

            {/* Where everyone stands, and who moved. The movers sit beside the
                funnel rather than in their own panel: fifteen names are the
                movement story, and separating them from the standing they
                moved within would leave both halves unreadable. */}
            <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
              <Panel className="lg:col-span-2">
                <PanelHeader
                  title="Where everyone stands"
                  icon={Layers}
                  subtitle={`Of ${totalUnique.toLocaleString()} players`}
                  action={
                    unrecorded > 0 ? (
                      <span className="rounded-[5px] bg-surface-subtle px-2 py-1 text-[12px] font-medium tabular-nums text-ink-secondary">
                        {Math.round((unrecorded / totalUnique) * 100)}% unrecorded
                      </span>
                    ) : undefined
                  }
                />
                <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                  <DiscipleshipFunnel stages={funnel} hrefFor={funnelHref} />
                  <MoversList report={movement} />
                </div>
              </Panel>

              <Panel>
                <PanelHeader title="Heading toward leading" icon={Sprout} subtitle="Self-reported intent" />
                <LeadershipPipelinePanel pipeline={pipeline} />
              </Panel>
            </div>

            {/* Can the people asking be placed. */}
            <MatchingMarketPanel market={market} />

            <SportMixPanel
              coverage={coverage.share}
              facets={sportSeries.map((s) => ({
                sport: s.sport,
                total: sportMix.find((m) => m.sport === s.sport)?.total ?? s.total,
                allTimeCounts:
                  sportMix.find((m) => m.sport === s.sport)?.counts ??
                  ({} as Record<DGroupSegment, number>),
                points: s.points.map((p) => ({
                  gameNightId: p.gameNightId,
                  label: formatDate(p.date),
                  counts: p.counts,
                })),
              }))}
              segmentColor={SEGMENT_COLOR}
            />

            {/* ── The subject changes here ───────────────────────────────
                The one generous interval on the page. Everything above is read
                quarterly and answers where people stand; everything below is
                read every four nights by whoever runs the night. Thirty-two
                pixels above the heading against twelve below it, so the break
                reads as a break rather than as another panel gap. */}
            {/* What leaders offer against what seekers want. Placement, not
                scheduling: a seeker who cannot meet when any group meets is
                unplaceable, so this belongs with the pastor's question rather
                than below the organiser divider where it first shipped. */}
            <SupplyDemandPanel data={supplyDemand} />

            <section aria-labelledby="organiser-section" className="mt-8 border-t border-border pt-5">
              <h2
                id="organiser-section"
                className="text-[15px] font-semibold tracking-[-0.01em] text-ink"
              >
                For organisers
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                Who turns up, who signs up, and who to call. Attendance panels cover the{" "}
                {scale.nightsWithFile} of {scale.totalNights} nights with a check-in file.
              </p>

            {hasAttendance && showUpBySport.length > 0 && (
              <ShowUpBySportPanel
                series={showUpBySport}
                nightsWithFile={scale.nightsWithFile}
                totalNights={scale.totalNights}
              />
            )}

            {/* Who registers. A bento of independent tiles — the component
                owns its own panels, because the four readings no longer share
                a question and should not share a container. */}
            <WhoRegisters demographics={demographics} />

              {/* The coverage caveat used to live under every panel it
                  qualified. It now opens this section, where a reader meets it
                  before the charts rather than after them. */}
              <RosterTable views={roster} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
