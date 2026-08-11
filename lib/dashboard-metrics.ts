// Aggregations for the dashboard (docs/spec/03-dashboard.md). Every function
// here is a pure computation over an already-fetched snapshot — the page
// fetches Players/Game Nights/Participations once via getDashboardData()
// (3 Sheets reads total, not one per metric) and passes that bundle through.
// Read-only throughout, per PRODUCT.md Product Principle 4.

import { listGameNights, listParticipations, listPlayers } from "./store";
import {
  D12_LEADER_STATUS,
  DGROUP_CATEGORIES,
  DGROUP_LEADER_STATUS,
  DGROUP_SEGMENTS,
  LEADER_STATUSES,
  getDGroupCategory,
  getPlayerSegment,
  isWillingToAbsorb,
  resolveParticipationSegment,
  resolveWillingToAbsorb,
} from "./dgroup";
import type { DGroupCategory, DGroupSegment } from "./dgroup";
import type { GameNight, Participation, Player, Sport } from "./types";

const SPORTS: Sport[] = ["Basketball", "Badminton", "Volleyball", "Pickleball", "Running"];

export interface DashboardData {
  players: Player[];
  gameNights: GameNight[];
  participations: Participation[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const [players, gameNights, participations] = await Promise.all([
    listPlayers(),
    listGameNights(),
    listParticipations(),
  ]);
  return { players, gameNights, participations };
}

function sortedGameNights(data: DashboardData): GameNight[] {
  return [...data.gameNights].sort((a, b) => a.gameNightDate.localeCompare(b.gameNightDate));
}

export function getLatestGameNight(data: DashboardData): GameNight | undefined {
  const nights = sortedGameNights(data);
  return nights[nights.length - 1];
}

// undefined when fewer than two game nights exist yet — there's nothing to
// compare the latest one against.
export function getPreviousGameNightCount(data: DashboardData): number | undefined {
  const nights = sortedGameNights(data);
  if (nights.length < 2) return undefined;
  const previous = nights[nights.length - 2];
  return data.participations.filter((p) => p.gameNightId === previous.gameNightId).length;
}

export function getTotalUniqueParticipants(data: DashboardData): number {
  return data.players.length;
}

export function getParticipantsForGameNight(data: DashboardData, gameNightId: string): Participation[] {
  return data.participations.filter((p) => p.gameNightId === gameNightId);
}

export function getGenderBreakdown(data: DashboardData): { gender: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const player of data.players) {
    const gender = player.gender?.trim() || "Unspecified";
    counts.set(gender, (counts.get(gender) ?? 0) + 1);
  }
  return [...counts.entries()].map(([gender, count]) => ({ gender, count }));
}

export function getReturneeFirstTimerCounts(
  data: DashboardData,
  gameNightId: string | undefined,
): { returnees: number; firstTimers: number } {
  if (!gameNightId) return { returnees: 0, firstTimers: 0 };
  const rows = getParticipantsForGameNight(data, gameNightId);
  const firstTimers = rows.filter((r) => r.isFirstParticipation).length;
  return { returnees: rows.length - firstTimers, firstTimers };
}

export interface TimeSeriesPoint {
  gameNightId: string;
  date: string;
  returnees: number;
  firstTimers: number;
}

export function getReturneeFirstTimerTimeSeries(data: DashboardData): TimeSeriesPoint[] {
  return sortedGameNights(data).map((gn) => {
    const { returnees, firstTimers } = getReturneeFirstTimerCounts(data, gn.gameNightId);
    return { gameNightId: gn.gameNightId, date: gn.gameNightDate, returnees, firstTimers };
  });
}

function countPlayersWhere(data: DashboardData, predicate: (p: Player) => boolean): number {
  return data.players.filter(predicate).length;
}

export function getDGroupSeekingCount(data: DashboardData): number {
  return countPlayersWhere(data, (p) => p.dgroupInterestedInJoining === "Yes");
}

export function getDGroupLeadersCount(data: DashboardData): number {
  return countPlayersWhere(data, (p) => !!p.dgroupStatus && LEADER_STATUSES.has(p.dgroupStatus));
}

export function getDGroupLeadersWillingToAbsorbCount(data: DashboardData): number {
  return countPlayersWhere(
    data,
    (p) => !!p.dgroupStatus && LEADER_STATUSES.has(p.dgroupStatus) && isWillingToAbsorb(p.dgroupLeadingWillingToAbsorb),
  );
}

export function getDGroupMembersCount(data: DashboardData): number {
  return countPlayersWhere(data, (p) => p.dgroupStatus === "DGroup Member");
}

export function getD12LeaderCount(data: DashboardData): number {
  return countPlayersWhere(data, (p) => p.dgroupStatus === D12_LEADER_STATUS);
}

export interface SportParticipationBreakdown {
  sport: Sport;
  returnees: number;
  firstTimers: number;
}

export function getSportParticipationBreakdown(data: DashboardData): SportParticipationBreakdown[] {
  const counts = new Map<Sport, { returnees: number; firstTimers: number }>(
    SPORTS.map((s) => [s, { returnees: 0, firstTimers: 0 }]),
  );
  for (const participation of data.participations) {
    const bucket = counts.get(participation.sportSelected as Sport);
    if (!bucket) continue;
    if (participation.isFirstParticipation) bucket.firstTimers++;
    else bucket.returnees++;
  }
  return [...counts.entries()]
    .map(([sport, c]) => ({ sport, ...c }))
    .sort((a, b) => b.returnees + b.firstTimers - (a.returnees + a.firstTimers));
}

export interface DGroupCategoryBreakdown {
  category: DGroupCategory;
  count: number;
}

// Fixed funnel order (Leader → D12 → Member → Seeking → Not involved), not
// sorted by size — the sequence itself carries the pipeline meaning.
export function getDGroupCategoryBreakdown(data: DashboardData): DGroupCategoryBreakdown[] {
  const counts = new Map<DGroupCategory, number>(DGROUP_CATEGORIES.map((c) => [c, 0]));
  for (const player of data.players) {
    const category = getDGroupCategory(player);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return DGROUP_CATEGORIES.map((category) => ({ category, count: counts.get(category) ?? 0 }));
}

export interface AttendanceFrequencyBucket {
  label: string;
  count: number;
}

const ATTENDANCE_BUCKETS = [
  { label: "1", min: 1, max: 1 },
  { label: "2–3", min: 2, max: 3 },
  { label: "4–6", min: 4, max: 6 },
  { label: "7–10", min: 7, max: 10 },
  { label: "11+", min: 11, max: Infinity },
];

export function getAttendanceFrequencyBuckets(data: DashboardData): AttendanceFrequencyBucket[] {
  const countByPlayer = new Map<string, number>();
  for (const p of data.participations) {
    countByPlayer.set(p.playerId, (countByPlayer.get(p.playerId) ?? 0) + 1);
  }
  const result = ATTENDANCE_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  for (const count of countByPlayer.values()) {
    const bucketIndex = ATTENDANCE_BUCKETS.findIndex((b) => count >= b.min && count <= b.max);
    if (bucketIndex !== -1) result[bucketIndex].count++;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Discipleship pipeline
//
// The dashboard's real job: turn the estate into worklists. Every figure here
// maps to a conversation someone has to have — a seeker to place, a member to
// invite into leading, a regular attender nobody has asked yet.
// ---------------------------------------------------------------------------

export interface SegmentCount {
  segment: DGroupSegment;
  count: number;
}

/** The four buckets, always in pipeline order, always summing to the estate. */
export function getSegmentBreakdown(data: DashboardData): SegmentCount[] {
  const counts = new Map<DGroupSegment, number>(DGROUP_SEGMENTS.map((s) => [s, 0]));
  for (const player of data.players) {
    const segment = getPlayerSegment(player);
    counts.set(segment, (counts.get(segment) ?? 0) + 1);
  }
  return DGROUP_SEGMENTS.map((segment) => ({ segment, count: counts.get(segment) ?? 0 }));
}

export interface LeadershipCapacity {
  leaders: number;
  dgroupLeaders: number;
  d12: number;
  willingToAbsorb: number;
  seekers: number;
  /** willingToAbsorb − seekers. Positive means open arms are going unused. */
  surplus: number;
}

/**
 * The matching market. Seekers are demand, leaders willing to absorb are
 * supply, and the gap between them is the single most actionable number on
 * the dashboard — it says whether the bottleneck is capacity or willingness.
 */
export function getLeadershipCapacity(data: DashboardData): LeadershipCapacity {
  let dgroupLeaders = 0;
  let d12 = 0;
  let willingToAbsorb = 0;
  let seekers = 0;

  for (const player of data.players) {
    if (player.dgroupStatus === DGROUP_LEADER_STATUS) dgroupLeaders += 1;
    if (player.dgroupStatus === D12_LEADER_STATUS) d12 += 1;
    const isLeader = !!player.dgroupStatus && LEADER_STATUSES.has(player.dgroupStatus);
    if (isLeader && isWillingToAbsorb(player.dgroupLeadingWillingToAbsorb)) willingToAbsorb += 1;
    if (getPlayerSegment(player) === "Seekers") seekers += 1;
  }

  return {
    leaders: dgroupLeaders + d12,
    dgroupLeaders,
    d12,
    willingToAbsorb,
    seekers,
    surplus: willingToAbsorb - seekers,
  };
}

export interface SegmentTimeSeriesPoint {
  gameNightId: string;
  date: string;
  counts: Record<DGroupSegment, number>;
  total: number;
  /** False when this night predates point-in-time capture and had to be inferred. */
  pointInTime: boolean;
}

function segmentAttendance(
  data: DashboardData,
  playersById: Map<string, Player>,
  rows: Participation[],
): { counts: Record<DGroupSegment, number>; total: number; pointInTime: boolean } {
  const counts = Object.fromEntries(DGROUP_SEGMENTS.map((s) => [s, 0])) as Record<DGroupSegment, number>;
  let inferred = 0;

  for (const row of rows) {
    const resolved = resolveParticipationSegment(row, playersById.get(row.playerId));
    counts[resolved.segment] += 1;
    if (!resolved.pointInTime) inferred += 1;
  }

  // A night counts as point-in-time only if every attendee's status came off
  // that night's own form — a partial night would mix measurement with
  // assumption inside one bar, which is worse than labelling the whole thing.
  return { counts, total: rows.length, pointInTime: rows.length > 0 && inferred === 0 };
}

/** Discipleship composition of who actually turned up, per game night. */
export function getSegmentTimeSeries(data: DashboardData): SegmentTimeSeriesPoint[] {
  const playersById = new Map(data.players.map((p) => [p.playerId, p]));
  const byNight = new Map<string, Participation[]>();
  for (const row of data.participations) {
    const list = byNight.get(row.gameNightId) ?? [];
    list.push(row);
    byNight.set(row.gameNightId, list);
  }

  return sortedGameNights(data).map((gn) => {
    const { counts, total, pointInTime } = segmentAttendance(data, playersById, byNight.get(gn.gameNightId) ?? []);
    return { gameNightId: gn.gameNightId, date: gn.gameNightDate, counts, total, pointInTime };
  });
}

export interface SportSegmentSeries {
  sport: Sport;
  points: SegmentTimeSeriesPoint[];
  total: number;
}

/**
 * The same composition, split by sport. Small multiples rather than one
 * combined chart: the question is which sport reaches the least-discipled
 * people, and that comparison needs a shared y-scale across facets, not five
 * series fighting inside one plot.
 */
export function getSegmentSeriesBySport(data: DashboardData): SportSegmentSeries[] {
  const playersById = new Map(data.players.map((p) => [p.playerId, p]));
  const nights = sortedGameNights(data);

  return SPORTS.map((sport) => {
    const byNight = new Map<string, Participation[]>();
    for (const row of data.participations) {
      if (row.sportSelected !== sport) continue;
      const list = byNight.get(row.gameNightId) ?? [];
      list.push(row);
      byNight.set(row.gameNightId, list);
    }

    const points = nights.map((gn) => {
      const { counts, total, pointInTime } = segmentAttendance(data, playersById, byNight.get(gn.gameNightId) ?? []);
      return { gameNightId: gn.gameNightId, date: gn.gameNightDate, counts, total, pointInTime };
    });

    return { sport, points, total: points.reduce((sum, p) => sum + p.total, 0) };
  })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Share of every sport's all-time attendance that sits in each segment. */
export function getSegmentMixBySport(data: DashboardData): { sport: Sport; counts: Record<DGroupSegment, number>; total: number }[] {
  const playersById = new Map(data.players.map((p) => [p.playerId, p]));

  return SPORTS.map((sport) => {
    const rows = data.participations.filter((p) => p.sportSelected === sport);
    const { counts, total } = segmentAttendance(data, playersById, rows);
    return { sport, counts, total };
  })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * How much of the history is measured rather than assumed. Drives the honesty
 * banner: until the historical exports are re-uploaded, the segment charts are
 * projections of today's status onto past nights.
 */
export function getPointInTimeCoverage(data: DashboardData): { nights: number; covered: number } {
  const series = getSegmentTimeSeries(data);
  return { nights: series.length, covered: series.filter((p) => p.pointInTime).length };
}

export interface TopReturningPlayer {
  player: Player;
  gameNightCount: number;
  frequentSports: Sport[];
  segment: DGroupSegment;
  willingToAbsorb: boolean;
}

export function getTopReturningPlayers(data: DashboardData, limit: number): TopReturningPlayer[] {
  const byPlayer = new Map<string, Participation[]>();
  for (const participation of data.participations) {
    const list = byPlayer.get(participation.playerId) ?? [];
    list.push(participation);
    byPlayer.set(participation.playerId, list);
  }

  const ranked: TopReturningPlayer[] = [];
  for (const [playerId, rows] of byPlayer) {
    if (rows.length < 2) continue; // "returning" requires at least a second appearance
    const player = data.players.find((p) => p.playerId === playerId);
    if (!player) continue;

    const sportCounts = new Map<string, number>();
    for (const row of rows) {
      const sport = row.sportSelected;
      sportCounts.set(sport, (sportCounts.get(sport) ?? 0) + 1);
    }
    const maxCount = Math.max(...sportCounts.values());
    const frequentSports = [...sportCounts.entries()]
      .filter(([, count]) => count === maxCount)
      .map(([sport]) => sport as Sport);

    ranked.push({
      player,
      gameNightCount: rows.length,
      frequentSports,
      segment: getPlayerSegment(player),
      willingToAbsorb: rows.some((r) => resolveWillingToAbsorb(r, player)),
    });
  }

  return ranked.sort((a, b) => b.gameNightCount - a.gameNightCount).slice(0, limit);
}
