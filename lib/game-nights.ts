// The season ledger and per-night record — docs/spec/07-game-nights.md.
//
// A night is a two-file thing now: the registration export and the door
// check-in list. The central rule here is that **a night with no check-in
// file has no attendance, which is not the same as nobody attending.** Every
// attendance figure below is `undefined` rather than 0 when the file is
// missing, so a caller cannot accidentally render an absence as a zero.

import { listGameNights, listParticipations, listPlayers } from "./store";
import { readAttendanceLink } from "./attendance-link";
import { matchAttendance } from "./attendance";
import type { GameNight, Participation, Player } from "./types";

export interface NightSummary {
  gameNight: GameNight;
  registered: number;
  firstTimers: number;
  /** Undefined until a check-in file has been uploaded for this night. */
  attended?: number;
  /** Registered AND turned up — the show-up numerator, walk-ins excluded. */
  registeredAndCame?: number;
  showUpRate?: number;
  walkIns: number;
  sports: { sport: string; count: number }[];
  /** e.g. "no Pickleball ran this night" — only when it explains an outlier. */
  anomaly?: string;
}

/** A sport running on at least this share of nights counts as usual. */
const USUAL_SPORT_SHARE = 0.75;
/** How far below the median a night must sit before it needs explaining. */
const OUTLIER_RATIO = 0.8;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function summarizeNights(gameNights: GameNight[], participations: Participation[]): NightSummary[] {
  const byNight = new Map<string, Participation[]>();
  for (const p of participations) {
    const list = byNight.get(p.gameNightId) ?? [];
    list.push(p);
    byNight.set(p.gameNightId, list);
  }

  // Which sports usually run, so a missing one can explain a thin night
  // rather than leaving it looking like a broken upload.
  const nightsPerSport = new Map<string, number>();
  for (const gameNight of gameNights) {
    const seen = new Set((byNight.get(gameNight.gameNightId) ?? []).map((p) => p.sportSelected));
    for (const sport of seen) nightsPerSport.set(sport, (nightsPerSport.get(sport) ?? 0) + 1);
  }
  const usualSports = [...nightsPerSport.entries()]
    .filter(([, count]) => count / Math.max(gameNights.length, 1) >= USUAL_SPORT_SHARE)
    .map(([sport]) => sport);

  const counts = gameNights.map((gn) => (byNight.get(gn.gameNightId) ?? []).length);
  const typical = median(counts);

  return gameNights
    .map((gameNight) => {
      const rows = byNight.get(gameNight.gameNightId) ?? [];
      const registered = rows.filter((r) => r.registered).length;
      const hasFile = !!gameNight.attendanceUploadedAt;
      const attended = hasFile ? rows.filter((r) => !!r.attendedAt).length : undefined;
      // Show-up rate must compare like with like. `attended` counts everyone
      // who came, walk-ins included, but they were never in the registered
      // denominator — dividing one by the other inflated 2026-05-02 to 94%
      // when 68 of its 99 arrivals had no registration at all.
      const registeredAndCame = hasFile
        ? rows.filter((r) => r.registered && !!r.attendedAt).length
        : undefined;

      const sportCounts = new Map<string, number>();
      for (const row of rows) sportCounts.set(row.sportSelected, (sportCounts.get(row.sportSelected) ?? 0) + 1);
      const present = new Set(sportCounts.keys());
      const missing = usualSports.filter((sport) => !present.has(sport));

      return {
        gameNight,
        registered,
        firstTimers: rows.filter((r) => r.isFirstParticipation).length,
        attended,
        showUpRate: registeredAndCame != null && registered > 0 ? registeredAndCame / registered : undefined,
        registeredAndCame,
        walkIns: rows.filter((r) => !r.registered).length,
        sports: [...sportCounts.entries()]
          .map(([sport, count]) => ({ sport, count }))
          .sort((a, b) => b.count - a.count),
        anomaly:
          rows.length < typical * OUTLIER_RATIO && missing.length > 0
            ? `no ${missing.join(" or ")} ran this night`
            : undefined,
      };
    })
    .sort((a, b) => b.gameNight.gameNightDate.localeCompare(a.gameNight.gameNightDate));
}

export interface NightLedger {
  nights: NightSummary[];
  total: number;
  awaitingAttendance: number;
}

export async function getNightLedger(): Promise<NightLedger> {
  const [gameNights, participations] = await Promise.all([listGameNights(), listParticipations()]);
  const nights = summarizeNights(gameNights, participations);
  return {
    nights,
    total: nights.length,
    awaitingAttendance: nights.filter((n) => n.attended == null).length,
  };
}

export interface ArrivalBucket {
  hour: number;
  label: string;
  count: number;
}

/**
 * Arrivals read from the night's linked sheet, before anything is committed.
 *
 * A preview, not a record: only unambiguous name matches are used, and none of
 * it is written until the night is imported. Nothing here touches
 * `attendance_uploaded_at`, so every show-up calculation still treats the
 * night as one with no check-in list — which, until it is imported, it is.
 */
export interface LiveArrivals {
  /** playerId → the check-in time, as written at the door. */
  byPlayer: Map<string, string>;
  /** Check-ins whose name matched nobody registered, or matched two people. */
  unresolved: number;
  total: number;
  tabTitle: string;
}

export interface NightDetail extends NightSummary {
  /** Empty until a check-in file exists. */
  arrivals: ArrivalBucket[];
  roster: { player: Player; participation: Participation }[];
  /** Present only while a night has a linked sheet and has not been imported. */
  live?: LiveArrivals;
}

const formatHour = (hour: number) => {
  const suffix = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${suffix}`;
};

export async function getNightDetail(gameNightId: string): Promise<NightDetail | undefined> {
  const [gameNights, participations, players] = await Promise.all([
    listGameNights(),
    listParticipations(),
    listPlayers(),
  ]);
  const gameNight = gameNights.find((gn) => gn.gameNightId === gameNightId);
  if (!gameNight) return undefined;

  const summary = summarizeNights(gameNights, participations).find(
    (n) => n.gameNight.gameNightId === gameNightId,
  )!;
  const playersById = new Map(players.map((p) => [p.playerId, p]));
  const rows = participations.filter((p) => p.gameNightId === gameNightId);

  // Bucket by the hour as written. Never timezone-convert: a 5:33pm arrival
  // read as UTC becomes 1:33am — see docs/spec/06-attendance.md.
  const byHour = new Map<number, number>();
  for (const row of rows) {
    const hour = row.attendedAt?.match(/T(\d{2}):/)?.[1];
    if (hour == null) continue;
    const n = Number(hour);
    byHour.set(n, (byHour.get(n) ?? 0) + 1);
  }

  // A night that points at a sheet but has not been imported shows what the
  // door has recorded so far. Read on render rather than held in client state,
  // so the whole table — sorting by arrival, filtering to who came — works on
  // live data without a second code path. Only un-imported nights with a link
  // pay for the read, which in practice means tonight and nothing else.
  let live: LiveArrivals | undefined;
  if (gameNight.attendanceSheetUrl && !gameNight.attendanceUploadedAt) {
    live = await readLiveArrivals(gameNight, rows, players);
  }

  return {
    ...summary,
    live,
    arrivals: [...byHour.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, count]) => ({ hour, label: formatHour(hour), count })),
    roster: rows
      .map((participation) => ({ participation, player: playersById.get(participation.playerId)! }))
      .filter((r) => !!r.player)
      .sort((a, b) => {
        // Present first, then by name — the people who came are what the
        // page is about, and the no-shows are the tail.
        const aCame = a.participation.attendedAt ? 0 : 1;
        const bCame = b.participation.attendedAt ? 0 : 1;
        if (aCame !== bCame) return aCame - bCame;
        return `${a.player.lastName}${a.player.firstName}`.localeCompare(
          `${b.player.lastName}${b.player.firstName}`,
        );
      }),
  };
}

/**
 * Matches the door sheet's bare names against the people registered for the
 * night, using only the unambiguous ones.
 *
 * A wrong link marks the wrong person present, and there is no email in a
 * check-in list to catch it — so a name that matches two people, or nobody, is
 * counted as unresolved and shown as a number rather than guessed at. Those
 * are exactly the rows the import's review queue exists to settle.
 */
async function readLiveArrivals(
  gameNight: GameNight,
  rows: Participation[],
  players: Player[],
): Promise<LiveArrivals | undefined> {
  const read = await readAttendanceLink(gameNight.attendanceSheetUrl!, gameNight.gameNightDate);
  if (!read.ok) return undefined;

  const registeredPlayerIds = new Set(rows.map((r) => r.playerId));
  const sportByPlayerId = new Map(rows.map((r) => [r.playerId, r.sportSelected]));
  const outcomes = matchAttendance(read.parsed.rows, players, { registeredPlayerIds, sportByPlayerId });

  const byPlayer = new Map<string, string>();
  let unresolved = 0;
  for (const outcome of outcomes) {
    if (outcome.kind === "matched") byPlayer.set(outcome.player.playerId, outcome.row.checkedInAt);
    else unresolved += 1;
  }

  return { byPlayer, unresolved, total: read.parsed.rows.length, tabTitle: read.tabTitle };
}
