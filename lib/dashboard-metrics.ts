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
  isUnplaced,
  isWillingToAbsorb,
  resolveParticipationSegment,
  resolveWillingToAbsorb,
} from "./dgroup";
import type { DGroupCategory, DGroupSegment } from "./dgroup";
import { buildMovements, movementTotals, summarize, type MovementTotals } from "./movement";
import { buildMatchBoard, isLeaderWithCapacity, sharesGender } from "./matching";
import { formatName } from "./player-name";
import { AGE_BANDS, ageBandOf, ageOf, genderOf, type AgeBand } from "./demographics";
import { TOTAL_FACET } from "./facets";
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

export interface CapacityByGender {
  gender: string;
  seekers: number;
  willingToAbsorb: number;
  surplus: number;
}

/**
 * The same market, split the way placement actually works: groups are not
 * mixed, so a woman seeking a group cannot be placed with a male leader. A
 * single combined surplus quietly overstates what is available to either
 * side. Only genders present in the data appear; nothing is assumed.
 */
export function getCapacityByGender(data: DashboardData): CapacityByGender[] {
  const buckets = new Map<string, CapacityByGender>();

  for (const player of data.players) {
    const gender = (player.gender ?? "").trim();
    if (!gender) continue;

    const isSeeker = getPlayerSegment(player) === "Seekers";
    const canAbsorb =
      getPlayerSegment(player) === "Leaders" && isWillingToAbsorb(player.dgroupLeadingWillingToAbsorb);
    if (!isSeeker && !canAbsorb) continue;

    const bucket = buckets.get(gender) ?? { gender, seekers: 0, willingToAbsorb: 0, surplus: 0 };
    if (isSeeker) bucket.seekers += 1;
    if (canAbsorb) bucket.willingToAbsorb += 1;
    buckets.set(gender, bucket);
  }

  return [...buckets.values()]
    .map((b) => ({ ...b, surplus: b.willingToAbsorb - b.seekers }))
    .sort((a, b) => b.seekers - a.seekers);
}

export interface SegmentTimeSeriesPoint {
  gameNightId: string;
  date: string;
  counts: Record<DGroupSegment, number>;
  total: number;
  /** How many attendees' status came directly off that night's own form. */
  covered: number;
}

function segmentAttendance(
  data: DashboardData,
  playersById: Map<string, Player>,
  rows: Participation[],
): { counts: Record<DGroupSegment, number>; total: number; covered: number } {
  const counts = Object.fromEntries(DGROUP_SEGMENTS.map((s) => [s, 0])) as Record<DGroupSegment, number>;
  let covered = 0;

  for (const row of rows) {
    const resolved = resolveParticipationSegment(row, playersById.get(row.playerId));
    counts[resolved.segment] += 1;
    if (resolved.pointInTime) covered += 1;
  }

  return { counts, total: rows.length, covered };
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
    const { counts, total, covered } = segmentAttendance(data, playersById, byNight.get(gn.gameNightId) ?? []);
    return { gameNightId: gn.gameNightId, date: gn.gameNightDate, counts, total, covered };
  });
}

export interface SportSegmentSeries {
  /** A sport, or `TOTAL_FACET` for the whole-population facet. */
  sport: string;
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

  const facet = (name: string, rows: Participation[]): SportSegmentSeries => {
    const byNight = new Map<string, Participation[]>();
    for (const row of rows) {
      const list = byNight.get(row.gameNightId) ?? [];
      list.push(row);
      byNight.set(row.gameNightId, list);
    }

    const points = nights.map((gn) => {
      const { counts, total, covered } = segmentAttendance(data, playersById, byNight.get(gn.gameNightId) ?? []);
      return { gameNightId: gn.gameNightId, date: gn.gameNightDate, counts, total, covered };
    });

    return { sport: name, points, total: points.reduce((sum, p) => sum + p.total, 0) };
  };

  const sports = SPORTS.map((sport) =>
    facet(sport, data.participations.filter((row) => row.sportSelected === sport)),
  )
    .filter((s) => s.total > 0)
    .sort((a, b) => a.sport.localeCompare(b.sport));

  const total = facet(TOTAL_FACET, data.participations);
  return total.total > 0 ? [total, ...sports] : sports;
}

/** Share of every sport's all-time attendance that sits in each segment. */
export function getSegmentMixBySport(data: DashboardData): { sport: string; counts: Record<DGroupSegment, number>; total: number }[] {
  const playersById = new Map(data.players.map((p) => [p.playerId, p]));

  const sports = SPORTS.map((sport) => {
    const rows = data.participations.filter((p) => p.sportSelected === sport);
    const { counts, total } = segmentAttendance(data, playersById, rows);
    return { sport: String(sport), counts, total };
  })
    .filter((s) => s.total > 0)
    .sort((a, b) => a.sport.localeCompare(b.sport));

  const all = segmentAttendance(data, playersById, data.participations);
  return all.total > 0
    ? [{ sport: TOTAL_FACET, counts: all.counts, total: all.total }, ...sports]
    : sports;
}

/**
 * Nights where the app captured NO attendee's own answer at all — a real
 * capture failure (the pipeline dropped data it was given), not a person
 * choosing to skip the question. First-timers are always asked and can't
 * skip, so any night with attendees but zero point-in-time answers means the
 * capture itself broke that night, not that everyone happened to decline.
 *
 * Deliberately does NOT fire on partial coverage: a returning player who
 * says "not my first time" and keeps their prior answer is expected,
 * permanent behavior, not a defect — see docs/spec/05-backfill.md.
 */
/**
 * Who changed where they stand this season. Rare by nature — most returning
 * players skip re-answering the question — so this reports a handful of
 * people, and the uncertain ones are held separate rather than folded into
 * the headline. See lib/movement.ts for what makes a change uncertain.
 */
export function getMovementTotals(data: DashboardData): MovementTotals {
  return movementTotals(buildMovements(data.participations, data.gameNights));
}

export interface PointInTimeCoverage {
  covered: number;
  total: number;
  share: number;
}

/**
 * How much of the per-night discipleship composition is a measurement rather
 * than an inference.
 *
 * Where a participation carries its own answer, the mix charts are measured.
 * Where it does not, the player's latest status is applied backwards — so
 * somebody who joined a group in June reads as a member in February and the
 * pipeline looks like it was healthier than it was. Totals stay correct; the
 * per-night shape is an estimate, and the panel is required to say so.
 */
export function getPointInTimeCoverage(data: DashboardData): PointInTimeCoverage {
  const covered = data.participations.filter(
    (row) => (row.dgroupStatus ?? "") !== "" || (row.dgroupInterestedInJoining ?? "") !== "",
  ).length;
  const total = data.participations.length;
  return { covered, total, share: total > 0 ? covered / total : 0 };
}

export function getCaptureGaps(data: DashboardData): { gameNightId: string; date: string }[] {
  return getSegmentTimeSeries(data)
    .filter((p) => p.total > 0 && p.covered === 0)
    .map((p) => ({ gameNightId: p.gameNightId, date: p.date }));
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

export interface AttendanceNight {
  gameNightId: string;
  date: string;
  registered: number;
  attended: number;
  showUpRate: number;
}

export interface AttendanceSummary {
  /** Only nights whose check-in file has actually been uploaded. */
  nights: AttendanceNight[];
  nightsWithoutFile: number;
  registered: number;
  attended: number;
  showUpRate: number;
}

/**
 * Registering and turning up are different events. A night is counted here
 * **only if its check-in file was uploaded** — a night without one has no
 * attendance, which is not the same as nobody attending, and averaging the
 * two together would understate the rate for every night that has a file.
 */
export function getAttendanceSummary(data: DashboardData): AttendanceSummary {
  const byNight = new Map<string, Participation[]>();
  for (const p of data.participations) {
    const list = byNight.get(p.gameNightId) ?? [];
    list.push(p);
    byNight.set(p.gameNightId, list);
  }

  const nights: AttendanceNight[] = [];
  let nightsWithoutFile = 0;

  for (const gameNight of sortedGameNights(data)) {
    if (!gameNight.attendanceUploadedAt) {
      nightsWithoutFile += 1;
      continue;
    }
    const rows = byNight.get(gameNight.gameNightId) ?? [];
    const registered = rows.filter((r) => r.registered).length;
    const attended = rows.filter((r) => !!r.attendedAt).length;
    nights.push({
      gameNightId: gameNight.gameNightId,
      date: gameNight.gameNightDate,
      registered,
      attended,
      showUpRate: registered > 0 ? attended / registered : 0,
    });
  }

  const registered = nights.reduce((sum, n) => sum + n.registered, 0);
  const attended = nights.reduce((sum, n) => sum + n.attended, 0);
  return {
    nights,
    nightsWithoutFile,
    registered,
    attended,
    showUpRate: registered > 0 ? attended / registered : 0,
  };
}

// ---------------------------------------------------------------------------
// Attendance-era metrics — docs/spec/03-dashboard.md §17–21.
//
// Everything above counts registrations. These count arrivals, and the two
// differ by a third: across nights with a check-in file, 2,452 registrations
// produced 1,610 arrivals. Nights without a file are excluded entirely rather
// than counted as zero.
// ---------------------------------------------------------------------------

const nightsWithAttendance = (data: DashboardData) =>
  data.gameNights.filter((gn) => !!gn.attendanceUploadedAt);

export interface AttendanceScale {
  nightsWithFile: number;
  totalNights: number;
  typicalNight: number;
  minNight: number;
  maxNight: number;
  uniqueCame: number;
  uniqueRegistered: number;
  /** Registered at least once and never once walked in. */
  neverCame: number;
  showUpRate: number;
}

export function getAttendanceScale(data: DashboardData): AttendanceScale {
  const nights = nightsWithAttendance(data);
  const ids = new Set(nights.map((n) => n.gameNightId));
  const rows = data.participations.filter((p) => ids.has(p.gameNightId));

  const perNight = nights.map(
    (n) => rows.filter((r) => r.gameNightId === n.gameNightId && !!r.attendedAt).length,
  );
  const came = new Set(rows.filter((r) => r.attendedAt).map((r) => r.playerId));
  const registered = new Set(rows.filter((r) => r.registered).map((r) => r.playerId));
  const registeredRows = rows.filter((r) => r.registered).length;
  const bothRows = rows.filter((r) => r.registered && r.attendedAt).length;

  return {
    nightsWithFile: nights.length,
    totalNights: data.gameNights.length,
    typicalNight: perNight.length ? Math.round(perNight.reduce((a, b) => a + b, 0) / perNight.length) : 0,
    minNight: perNight.length ? Math.min(...perNight) : 0,
    maxNight: perNight.length ? Math.max(...perNight) : 0,
    uniqueCame: came.size,
    uniqueRegistered: registered.size,
    neverCame: [...registered].filter((id) => !came.has(id)).length,
    showUpRate: registeredRows > 0 ? bothRows / registeredRows : 0,
  };
}

export interface PresentPlayer {
  player: Player;
  nightsAttended: number;
  segment: DGroupSegment;
  frequentSport?: string;
}

/** Attended — not merely registered — at least `minNights` times. */
export function getMostPresent(data: DashboardData, minNights = 1): PresentPlayer[] {
  const ids = new Set(nightsWithAttendance(data).map((n) => n.gameNightId));
  const byPlayer = new Map<string, { nights: number; sports: Map<string, number> }>();

  for (const row of data.participations) {
    if (!ids.has(row.gameNightId) || !row.attendedAt) continue;
    const entry = byPlayer.get(row.playerId) ?? { nights: 0, sports: new Map() };
    entry.nights += 1;
    // What they played beats what they signed up for.
    const sport = row.attendedSport ?? row.sportSelected;
    entry.sports.set(sport, (entry.sports.get(sport) ?? 0) + 1);
    byPlayer.set(row.playerId, entry);
  }

  const playersById = new Map(data.players.map((p) => [p.playerId, p]));
  return [...byPlayer.entries()]
    .filter(([, v]) => v.nights >= minNights)
    .map(([playerId, v]): PresentPlayer | null => {
      const player = playersById.get(playerId);
      if (!player) return null;
      const frequentSport = [...v.sports.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return { player, nightsAttended: v.nights, segment: getPlayerSegment(player), frequentSport };
    })
    .filter((x): x is PresentPlayer => x !== null)
    .sort((a, b) => b.nightsAttended - a.nightsAttended);
}

/** Present regularly and still in no group — the demand side of placement. */
export function getPresentButUnplaced(data: DashboardData, minNights = 5): PresentPlayer[] {
  return getMostPresent(data, minNights).filter(
    (p) => isUnplaced(p.segment),
  );
}

export interface CapacitySplit {
  dgroupLeaders: { total: number; willing: number };
  d12: { total: number; willing: number };
  totalWilling: number;
}

export function getCapacitySplit(data: DashboardData): CapacitySplit {
  const split: CapacitySplit = {
    dgroupLeaders: { total: 0, willing: 0 },
    d12: { total: 0, willing: 0 },
    totalWilling: 0,
  };
  for (const player of data.players) {
    const bucket =
      player.dgroupStatus === DGROUP_LEADER_STATUS
        ? split.dgroupLeaders
        : player.dgroupStatus === D12_LEADER_STATUS
          ? split.d12
          : null;
    if (!bucket) continue;
    bucket.total += 1;
    if (isWillingToAbsorb(player.dgroupLeadingWillingToAbsorb)) {
      bucket.willing += 1;
      split.totalWilling += 1;
    }
  }
  return split;
}

export interface SportAttendance {
  sport: string;
  registered: number;
  came: number;
  noShow: number;
  rate: number;
}

export function getSportAttendance(data: DashboardData): SportAttendance[] {
  const ids = new Set(nightsWithAttendance(data).map((n) => n.gameNightId));
  const counts = new Map<string, { registered: number; came: number }>();

  for (const row of data.participations) {
    if (!ids.has(row.gameNightId)) continue;
    // Registrants only. Counting walk-in arrivals against a registered
    // denominator mixes two populations and overstates every sport by 3-5
    // points — the same defect already fixed in the per-night show-up rate
    // (lib/game-nights.ts). 84 walk-ins were landing in these numerators.
    if (!row.registered) continue;
    const sport = row.sportSelected || "Unspecified";
    const entry = counts.get(sport) ?? { registered: 0, came: 0 };
    entry.registered += 1;
    if (row.attendedAt) entry.came += 1;
    counts.set(sport, entry);
  }

  return [...counts.entries()]
    .map(([sport, v]) => ({
      sport,
      registered: v.registered,
      came: v.came,
      // Arrivals plus no-shows sum to registrations. Never stack registered
      // against came — attendance is a subset, and stacking double-counts.
      noShow: v.registered - v.came,
      rate: v.registered > 0 ? v.came / v.registered : 0,
    }))
    .filter((s) => s.registered > 0)
    .sort((a, b) => b.registered - a.registered);
}

// ---------------------------------------------------------------------------
// The operational story: retention, rhythm, depth, and where everyone sits.
// Added 2026-08-13 with the dashboard rebuild.
// ---------------------------------------------------------------------------

export interface PipelineStage {
  label: string;
  count: number;
  /** Ready or nearly ready — the people worth a conversation this quarter. */
  actionable?: boolean;
}

export interface LeadershipPipeline {
  stages: PipelineStage[];
  answered: number;
  actionable: number;
}

/**
 * Who says they are heading toward leading a group.
 *
 * Reads `"Are you planning to lead a DGroup soon?"`, a form field captured on
 * 399 players and, until now, never surfaced anywhere in the app. It is the
 * only forward-looking discipleship signal in the data: the status questions
 * describe where someone stands, this one describes where they are going.
 *
 * A stock, not a flow — it cannot say how many people advanced this season,
 * because that needs re-answers the roster does not have. What it can say is
 * who is ready now, which is the question a pastor acts on.
 *
 * Reported over the 399 who answered rather than all 1,080. The unanswered
 * majority is named in the panel's label instead of drawn as a band: unlike
 * the funnel, where the gap *is* the finding, here it would bury four bars
 * under one.
 */
const PIPELINE_ANSWERS: { match: RegExp; label: string; actionable?: boolean }[] = [
  { match: /no plans/i, label: "No plans yet" },
  { match: /next year/i, label: "Planning next year" },
  { match: /1-3 months|praying/i, label: "Praying, 1–3 months", actionable: true },
  { match: /ready|now/i, label: "Ready to start now", actionable: true },
];

export function getLeadershipPipeline(data: DashboardData): LeadershipPipeline {
  const counts = new Map<string, number>(PIPELINE_ANSWERS.map((a) => [a.label, 0]));
  let answered = 0;

  for (const player of data.players) {
    const value = String(player.raw["Are you planning to lead a DGroup soon?"] ?? "").trim();
    if (!value) continue;
    const entry = PIPELINE_ANSWERS.find((a) => a.match.test(value));
    if (!entry) continue;
    counts.set(entry.label, (counts.get(entry.label) ?? 0) + 1);
    answered += 1;
  }

  const stages = PIPELINE_ANSWERS.map((a) => ({
    label: a.label,
    count: counts.get(a.label) ?? 0,
    actionable: a.actionable,
  }));

  return {
    stages,
    answered,
    actionable: stages.filter((st) => st.actionable).reduce((sum, st) => sum + st.count, 0),
  };
}

export interface PyramidRow {
  band: AgeBand;
  male: number;
  female: number;
}

export interface Split {
  label: string;
  count: number;
}

/**
 * One age band, cut four ways.
 *
 * **Currently computed and not rendered.** The strip that drew it was removed
 * on request (2026-08-14); the measurement is kept because it is the only
 * honest substitute the data allows for "what factors contribute to a seeker
 * being absorbed" (see docs/spec/03-dashboard.md), and it costs one pass that
 * the pyramid already makes.
 *
 * **Association, not cause** — nothing here says age makes someone join a
 * group, and anything that renders it again must say so on the surface.
 */
export interface AgeCrossTabRow {
  band: AgeBand;
  /** Players in this band with a birth year — every share's denominator. */
  n: number;
  women: number;
  single: number;
  ccf: number;
  leaders: number;
  notInGroup: number;
}

export interface RegistrationDemographics {
  pyramid: PyramidRow[];
  crossTab: AgeCrossTabRow[];
  total: number;
  withAge: number;
  medianAge?: number;
  male: number;
  female: number;
  unspecified: number;
  civilStatus: Split[];
  church: Split[];
  locations: Split[];
  otherLocations: number;
}

/** Longest-first, so "Quezon City" cannot be swallowed by a "Quezon" bucket. */
function topSplits(values: string[], keep: number): { top: Split[]; rest: number } {
  const counts = new Map<string, number>();
  for (const value of values) {
    const cleaned = value.trim();
    if (!cleaned || /^(n\/a|na|none|-)$/i.test(cleaned)) continue;
    const key = cleaned.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    top: sorted.slice(0, keep).map(([label, count]) => ({ label, count })),
    rest: sorted.slice(keep).reduce((sum, [, count]) => sum + count, 0),
  };
}

/**
 * Who signs up, across the whole roster — not sliced by how often they came.
 *
 * Replaced an attendance-banded version (2026-08-13). Cutting every
 * demographic by nights-attended asked the reader to hold four populations in
 * mind before seeing a single fact about the ministry, and three of the four
 * cuts were flat anyway. This answers the plainer question first: who is
 * actually here.
 *
 * The age-by-gender pyramid carries the finding the banded version buried:
 * the ministry is 46-49% women in every age band from 25 up, and **31%**
 * women at 18-24. The skew is generational, not general.
 */
export function getRegistrationDemographics(
  data: DashboardData,
  asOfYear: number,
): RegistrationDemographics {
  const ages: number[] = [];
  const pyramid = new Map<AgeBand, { male: number; female: number }>(
    AGE_BANDS.map((b) => [b.label, { male: 0, female: 0 }]),
  );
  const crossTab = new Map<AgeBand, AgeCrossTabRow>(
    AGE_BANDS.map((b) => [
      b.label,
      { band: b.label, n: 0, women: 0, single: 0, ccf: 0, leaders: 0, notInGroup: 0 },
    ]),
  );

  for (const player of data.players) {
    const age = ageOf(player, asOfYear);
    if (age == null) continue;
    ages.push(age);
    const band = ageBandOf(age);
    if (!band) continue;
    const gender = genderOf(player);
    if (gender === "Male") pyramid.get(band)!.male += 1;
    else if (gender === "Female") pyramid.get(band)!.female += 1;

    const row = crossTab.get(band)!;
    row.n += 1;
    if (gender === "Female") row.women += 1;
    if (/single/i.test(player.civilStatus ?? "")) row.single += 1;
    if (/ccf/i.test(player.churchAffiliation ?? "")) row.ccf += 1;
    const segment = getPlayerSegment(player);
    if (segment === "Leaders") row.leaders += 1;
    if (isUnplaced(segment)) row.notInGroup += 1;
  }

  ages.sort((a, b) => a - b);
  const civil = topSplits(data.players.map((p) => p.civilStatus ?? ""), 4);
  const church = topSplits(data.players.map((p) => p.churchAffiliation ?? ""), 3);
  // Eight rather than six: this is the one demographic that is operational
  // (location is a DGroup matching criterion), so the tail is worth naming
  // before it collapses into "more across other areas".
  const location = topSplits(
    data.players.map((p) => String(p.raw["Your Workplace Area"] ?? "")),
    8,
  );

  return {
    pyramid: AGE_BANDS.map((b) => ({ band: b.label, ...pyramid.get(b.label)! })),
    crossTab: AGE_BANDS.map((b) => crossTab.get(b.label)!).filter((row) => row.n > 0),
    total: data.players.length,
    withAge: ages.length,
    medianAge: ages.length > 0 ? ages[Math.floor(ages.length / 2)] : undefined,
    male: data.players.filter((p) => genderOf(p) === "Male").length,
    female: data.players.filter((p) => genderOf(p) === "Female").length,
    unspecified: data.players.filter((p) => genderOf(p) === "Unspecified").length,
    civilStatus: civil.top,
    church: church.top,
    locations: location.top,
    otherLocations: location.rest,
  };
}

export interface CommitmentBucket {
  nights: number;
  people: number;
}

/**
 * How many people attended exactly N nights, across the whole roster.
 *
 * Counts **arrivals**, and keeps the zero bucket. 373 of 1,080 players
 * registered at some point and never once walked in; folding them into a
 * "1 or more" bar would hide the largest group on the chart. 773 of 1,080 —
 * 72% — attended at most once, and that shape is the finding.
 *
 * Undercounts slightly against the two nights with no check-in file, which is
 * why the panel labels its population.
 */
export function getCommitmentCurve(data: DashboardData): CommitmentBucket[] {
  const nightsCame = new Map<string, number>();
  for (const row of data.participations) {
    if (!row.attendedAt) continue;
    nightsCame.set(row.playerId, (nightsCame.get(row.playerId) ?? 0) + 1);
  }

  const counts = new Map<number, number>();
  for (const player of data.players) {
    const n = nightsCame.get(player.playerId) ?? 0;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }

  const max = Math.max(0, ...counts.keys());
  return Array.from({ length: max + 1 }, (_, nights) => ({ nights, people: counts.get(nights) ?? 0 }));
}

export interface FunnelStage {
  label: string;
  count: number;
  /** Marks the stage that is a data gap rather than a place someone stands. */
  unrecorded?: boolean;
  /** The canonical category this stage counts, so a link can return exactly it. */
  category: DGroupCategory;
}

/**
 * Where the whole roster sits, in one column.
 *
 * **Derived from `getDGroupCategory`, not from its own rule.** Until
 * 2026-08-14 this counted with a private classification that read the
 * membership field where the segment breakdown read the interest field, so
 * one panel said 40 seekers and another said 48, one said 449 not involved
 * and another said 121, and a funnel row linked to a list that did not match
 * its own label. There is now one rule; every stage below is a category, and
 * the counts on this page cannot drift apart again.
 *
 * That correction moved real people. The old rule's "Not recorded" band swept
 * up 38 players who had answered **"Yes, I am interested in joining a group"**
 * — drawing the most actionable people in the ministry as nobody had asked
 * them — plus 159 who said "Cannot decide, I will pray about it" and 37 who
 * declined outright. Only 72 had genuinely said nothing.
 *
 * **The unrecorded band is still deliberate and load-bearing**, just honestly
 * sized: a funnel that dropped it would overstate every stage below and imply
 * the ministry knows where all of its people stand.
 *
 * Read most-committed-first in the fallback chain, rendered least-committed
 * first because that is the order of the journey.
 */
export function getDiscipleshipFunnel(data: DashboardData): FunnelStage[] {
  const counts = new Map<DGroupCategory, number>(DGROUP_CATEGORIES.map((c) => [c, 0]));
  for (const player of data.players) {
    const category = getDGroupCategory(player);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const stage = (label: string, category: DGroupCategory, unrecorded?: boolean): FunnelStage => ({
    label,
    category,
    count: counts.get(category) ?? 0,
    ...(unrecorded ? { unrecorded: true } : {}),
  });

  return [
    stage("Never asked", "Not recorded", true),
    stage("Asked, not involved", "Not involved"),
    stage("Seeking a group", "Seeking"),
    stage("DGroup member", "DGroup Member"),
    stage("DGroup leader", "DGroup Leader"),
    stage("D12", "D12"),
  ];
}

export interface SportShowUpPoint {
  gameNightId: string;
  date: string;
  came: number;
  noShow: number;
}

export interface SportShowUpSeries {
  /** A sport, or `TOTAL_FACET` for the whole-season facet drawn first. */
  sport: string;
  points: SportShowUpPoint[];
  registered: number;
  came: number;
  rate: number;
}

/**
 * Arrivals and no-shows per sport per night, as a true part-to-whole: the two
 * bands sum to that sport's registrations for that night.
 *
 * Never registered-beside-came. Attendance is a subset of registration, not a
 * sibling category, so stacking those two double-counts every night and
 * overstates the totals — the same reason `getSportAttendance` splits into
 * arrivals plus no-shows rather than plotting both populations.
 *
 * Ordered alphabetically, matching every other sport facet on the page. The
 * worst-performing sport is marked with a chip rather than promoted to first
 * position: two panels listing the same five sports in two different orders
 * cost more, in cross-reading, than ranking bought.
 *
 * Restricted to nights with a check-in file (15 of 17 this season; 2026-04-18
 * and 2026-05-16 have none). A night with no file has an unknown split, and
 * plotting it would draw every registrant as a no-show — a night the app never
 * measured would read as the worst night of the season.
 *
 * A sport with zero registrations on a night that *was* measured is a real
 * zero and stays in the series: Pickleball did not run on 2026-05-02 or
 * 2026-06-20, and that is a fact about the season, not missing data.
 *
 * **Population: people who registered.** Walk-ins are excluded from both
 * bands, because the question is whether a registration became an arrival and
 * a walk-in never made one. Counting them as arrivals against a registered
 * denominator mixes two populations and inflates every rate — it put
 * Pickleball at 72% when 67% of its registrants came, and on 2026-05-02 it
 * produced 28 arrivals against 0 registrations, a stack taller than the whole
 * it was supposedly part of. With walk-ins out, the two bands sum to
 * registrations exactly and `noShow` can never go negative.
 */
export function getShowUpSeriesBySport(data: DashboardData): SportShowUpSeries[] {
  const nights = [...nightsWithAttendance(data)].sort((a, b) =>
    a.gameNightDate.localeCompare(b.gameNightDate),
  );

  const facet = (name: string, rows: Participation[]): SportShowUpSeries => {
    const byNight = new Map<string, { came: number; registered: number }>();
    for (const row of rows) {
      if (!row.registered) continue; // walk-in — see the population note above
      const entry = byNight.get(row.gameNightId) ?? { came: 0, registered: 0 };
      entry.registered += 1;
      if (row.attendedAt) entry.came += 1;
      byNight.set(row.gameNightId, entry);
    }

    const points = nights.map((gn) => {
      const entry = byNight.get(gn.gameNightId) ?? { came: 0, registered: 0 };
      return {
        gameNightId: gn.gameNightId,
        date: gn.gameNightDate,
        came: entry.came,
        noShow: entry.registered - entry.came,
      };
    });

    const registered = points.reduce((sum, p) => sum + p.came + p.noShow, 0);
    const came = points.reduce((sum, p) => sum + p.came, 0);
    return { sport: name, points, registered, came, rate: registered > 0 ? came / registered : 0 };
  };

  const sports = SPORTS.map((sport) =>
    facet(sport, data.participations.filter((row) => row.sportSelected === sport)),
  )
    .filter((s) => s.registered > 0)
    .sort((a, b) => a.sport.localeCompare(b.sport));

  // Counted over every registration, so this facet agrees with the season
  // figures in the metric row rather than with the sum of the five sports —
  // nine participations carry no sport at all.
  const total = facet(TOTAL_FACET, data.participations);
  return total.registered > 0 ? [total, ...sports] : sports;
}

export interface NightAttendancePoint {
  gameNightId: string;
  date: string;
  registered: number;
  came: number;
}

// ---------------------------------------------------------------------------
// The question-led rebuild, 2026-08-14. One function per named question.
// ---------------------------------------------------------------------------

export interface MarketByGender {
  gender: string;
  seekers: number;
  /** Seekers with at least one eligible leader. */
  matchable: number;
  /** Same-gender leaders with capacity — the pool they were compared against. */
  leaders: number;
}

export interface MatchingMarket {
  seekers: number;
  matchable: number;
  leaders: number;
  byGender: MarketByGender[];
  /** One entry per seeker: how many eligible leaders they have. Sorted. */
  candidateCounts: number[];
  min: number;
  median: number;
  max: number;
}

/**
 * Whether seekers can be placed at all, and how much choice each one has.
 *
 * Scored by `buildMatchBoard`, so this and the `/match` board can never
 * disagree about who is eligible for whom — both gates (same gender, at least
 * one shared day) run there, not here.
 *
 * Split by gender because groups are not mixed: a surplus of male leaders
 * cannot place a female seeker, so a combined figure would describe a market
 * that does not exist.
 *
 * The panel that renders this must not frame it as a yes/no question. Every
 * seeker is matchable and the median has twenty-six options; the constraint
 * is that nobody has made the introduction.
 */
export function getMatchingMarket(data: DashboardData): MatchingMarket {
  const board = buildMatchBoard(data.players);
  const leaders = data.players.filter(isLeaderWithCapacity);

  const byGender = new Map<string, MarketByGender>();
  const candidateCounts: number[] = [];

  for (const match of board) {
    const gender = (match.seeker.gender ?? "").trim() || "Unspecified";
    const row =
      byGender.get(gender) ??
      ({
        gender,
        seekers: 0,
        matchable: 0,
        leaders: leaders.filter((leader) => sharesGender(match.seeker, leader)).length,
      } satisfies MarketByGender);
    row.seekers += 1;
    if (match.candidates.length > 0) row.matchable += 1;
    byGender.set(gender, row);
    candidateCounts.push(match.candidates.length);
  }

  candidateCounts.sort((a, b) => a - b);

  return {
    seekers: board.length,
    matchable: candidateCounts.filter((n) => n > 0).length,
    leaders: leaders.length,
    byGender: [...byGender.values()].sort((a, b) => b.seekers - a.seekers),
    candidateCounts,
    min: candidateCounts[0] ?? 0,
    median: candidateCounts[Math.floor(candidateCounts.length / 2)] ?? 0,
    max: candidateCounts[candidateCounts.length - 1] ?? 0,
  };
}

export interface Mover {
  playerId: string;
  name: string;
  from: DGroupSegment;
  to: DGroupSegment;
  direction: "forward" | "backward";
  /** The night their new answer was recorded. */
  date: string;
}

export interface MovementReport {
  /** Named, confident movers — forward first, then most recent. */
  movers: Mover[];
  forward: number;
  backward: number;
  /** Round trips and D12/Member wording flips, held out of the named list. */
  uncertain: number;
  /** Players who ever answered the question on two or more nights. */
  everAnsweredTwice: number;
  roster: number;
}

/**
 * Who changed where they stand, by name.
 *
 * Counts rather than a chart, and that is forced by the data rather than
 * chosen: a couple of dozen people out of a thousand ever re-answer the
 * question, so a trend line would draw a distribution fifteen points cannot
 * support.
 *
 * The dashboard renders the three totals only — the named list was removed
 * from it on 2026-08-14 — and hands off to `/players?view=moved`, where the
 * same people carry contact details and an export. `movers` is still returned
 * with names because that is what makes the count checkable, and because a
 * follow-up surface may want it again.
 */
export function getMovers(data: DashboardData): MovementReport {
  const movements = buildMovements(data.participations, data.gameNights);
  const nameById = new Map(data.players.map((p) => [p.playerId, formatName(p)]));

  const movers: Mover[] = [];
  let forward = 0;
  let backward = 0;
  let uncertain = 0;
  let everAnsweredTwice = 0;

  for (const movement of movements.values()) {
    if (movement.points.length > 1) everAnsweredTwice += 1;
    const summary = summarize(movement);
    if (!summary) continue;
    if (summary.uncertain) {
      uncertain += 1;
      continue;
    }
    if (summary.direction === "forward") forward += 1;
    else backward += 1;

    movers.push({
      playerId: movement.playerId,
      name: nameById.get(movement.playerId) ?? "Unnamed player",
      from: summary.from,
      to: summary.to,
      direction: summary.direction,
      date: movement.changes[movement.changes.length - 1].to.date,
    });
  }

  movers.sort(
    (a, b) =>
      Number(b.direction === "forward") - Number(a.direction === "forward") ||
      b.date.localeCompare(a.date),
  );

  return { movers, forward, backward, uncertain, everAnsweredTwice, roster: data.players.length };
}

export interface RosterRow {
  playerId: string;
  name: string;
  segment: DGroupSegment;
  nightsAttended: number;
  registrations: number;
  missed: number;
  frequentSport?: string;
  /**
   * Registered repeatedly and never once recorded at the door. Either a real
   * pattern or a name the check-in list never resolved — the data cannot tell
   * those apart, so the table flags it rather than asserting a no-show.
   */
  unmatchedName?: boolean;
}

export interface RosterViews {
  returning: RosterRow[];
  noShows: RosterRow[];
  unplaced: RosterRow[];
  nightsWithFile: number;
  totalNights: number;
}

/** Registrations before a no-show pattern is worth naming as one. */
const NO_SHOW_MIN_REGISTRATIONS = 5;

/**
 * The three roster cuts, already slimmed to what a table row renders.
 *
 * Deliberately not `Player` objects: this feeds a client component, and every
 * player carries its whole raw form payload — shipping a dozen of those to
 * the browser would be most of a megabyte to draw twelve names.
 *
 * All three are restricted to nights with a check-in file. A night the app
 * never measured would otherwise read as a night nobody came to.
 */
export function getRosterViews(data: DashboardData, limit = 12): RosterViews {
  const nights = nightsWithAttendance(data);
  const ids = new Set(nights.map((n) => n.gameNightId));

  const byPlayer = new Map<string, { came: number; registered: number; sports: Map<string, number> }>();
  for (const row of data.participations) {
    if (!ids.has(row.gameNightId)) continue;
    const entry = byPlayer.get(row.playerId) ?? { came: 0, registered: 0, sports: new Map() };
    if (row.registered) entry.registered += 1;
    if (row.attendedAt) {
      entry.came += 1;
      // What they played beats what they signed up for.
      const sport = row.attendedSport ?? row.sportSelected;
      entry.sports.set(sport, (entry.sports.get(sport) ?? 0) + 1);
    }
    byPlayer.set(row.playerId, entry);
  }

  const rows: RosterRow[] = [];
  for (const player of data.players) {
    const entry = byPlayer.get(player.playerId);
    if (!entry) continue;
    rows.push({
      playerId: player.playerId,
      name: formatName(player),
      segment: getPlayerSegment(player),
      nightsAttended: entry.came,
      registrations: entry.registered,
      // Never negative: a walk-in adds an arrival without a registration, so
      // the floor is the same population correction the sport panels make.
      missed: Math.max(0, entry.registered - entry.came),
      frequentSport: [...entry.sports.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
      unmatchedName: entry.came === 0 && entry.registered >= NO_SHOW_MIN_REGISTRATIONS,
    });
  }

  const byAttendance = (a: RosterRow, b: RosterRow) =>
    b.nightsAttended - a.nightsAttended || a.name.localeCompare(b.name);

  return {
    returning: rows.filter((r) => r.nightsAttended > 0).sort(byAttendance).slice(0, limit),
    noShows: rows
      .filter((r) => r.registrations >= NO_SHOW_MIN_REGISTRATIONS && r.missed > 0)
      .sort((a, b) => b.missed - a.missed || a.name.localeCompare(b.name))
      .slice(0, limit),
    unplaced: rows
      .filter((r) => r.nightsAttended > 0 && isUnplaced(r.segment))
      .sort(byAttendance)
      .slice(0, limit),
    nightsWithFile: nights.length,
    totalNights: data.gameNights.length,
  };
}

/** Only nights with a file — a missing night is absent, never plotted as 0. */
export function getRegisteredVsCame(data: DashboardData): NightAttendancePoint[] {
  return nightsWithAttendance(data)
    .map((gn) => {
      const rows = data.participations.filter((p) => p.gameNightId === gn.gameNightId);
      return {
        gameNightId: gn.gameNightId,
        date: gn.gameNightDate,
        registered: rows.filter((r) => r.registered).length,
        came: rows.filter((r) => r.attendedAt).length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
