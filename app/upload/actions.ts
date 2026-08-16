"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";

import { parseRosterFile } from "@/lib/parse";
import { matchRowsAgainstHistory } from "@/lib/match";
import { matchAttendance, parseAttendanceFile, type AttendanceCandidate } from "@/lib/attendance";
import { buildHistories, type PlayerHistory } from "@/lib/candidate-evidence";
import {
  buildGameNight,
  buildParticipation,
  buildPlayer,
  commitBatchToSheets,
  findGameNightByDate,
  listGameNights,
  listParticipations,
  listPlayers,
  listPlayersWithRows,
  listParticipationsWithRows,
  findGameNightWithRow,
  commitAttendanceToSheets,
  type PlayerWithRow,
  type ParticipationWithRow,
} from "@/lib/store";
import type {
  GameNight,
  IncomingAttendanceRow,
  IncomingRow,
  MatchOutcome,
  Participation,
  Player,
  ReviewAction,
} from "@/lib/types";

export interface ParseAndMatchResult {
  ok: true;
  sourceFilename: string;
  rowCount: number;
  unusableRowCount: number;
  withinBatchDuplicatesCollapsed: number;
  autoConfirmed: Extract<MatchOutcome, { kind: "new" | "returning" }>[];
  ambiguous: Extract<MatchOutcome, { kind: "ambiguous" }>[];
  /**
   * Keyed by playerId, and only for players who appear on a review card.
   * Carried alongside the outcomes rather than folded into them so the commit
   * path keeps taking plain `Player`s — history is evidence for the reviewer,
   * never something that gets written back.
   */
  histories: Record<string, PlayerHistory>;
}

export interface ParseAndMatchError {
  ok: false;
  reason: "missing-columns" | "empty-file";
  missingColumns?: string[];
}

export async function parseAndMatch(formData: FormData): Promise<ParseAndMatchResult | ParseAndMatchError> {
  await assertAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { ok: false, reason: "empty-file" };
  }

  const buffer = await file.arrayBuffer();
  const parsed = await parseRosterFile(buffer);

  if (!parsed.ok) {
    return { ok: false, reason: "missing-columns", missingColumns: parsed.missingColumns };
  }

  const existingPlayers = await listPlayers();
  const { outcomes, withinBatchDuplicatesCollapsed } = matchRowsAgainstHistory(parsed.rows, existingPlayers);

  const autoConfirmed = outcomes.filter(
    (o): o is Extract<MatchOutcome, { kind: "new" | "returning" }> => o.kind === "new" || o.kind === "returning",
  );
  const ambiguous = outcomes.filter(
    (o): o is Extract<MatchOutcome, { kind: "ambiguous" }> => o.kind === "ambiguous",
  );

  // Only the players a reviewer will actually look at. When nothing was
  // flagged this reads neither sheet — the common case on a clean upload.
  const candidateIds = new Set(ambiguous.flatMap((o) => o.candidates.map((c) => c.playerId)));
  const histories =
    candidateIds.size > 0
      ? buildHistories(candidateIds, await listParticipations(), await listGameNights())
      : {};

  return {
    ok: true,
    sourceFilename: file.name,
    rowCount: parsed.rows.length,
    unusableRowCount: parsed.unusableRowCount,
    withinBatchDuplicatesCollapsed,
    autoConfirmed,
    ambiguous,
    histories,
  };
}

export interface CommitBatchInput {
  gameNightDate: string;
  sourceFilename: string;
  rowCount: number;
  autoConfirmed: Extract<MatchOutcome, { kind: "new" | "returning" }>[];
  ambiguous: { row: IncomingRow; candidates: Player[]; action: ReviewAction }[];
  uploadedBy: string;
  /** Set only after the admin confirms they meant to re-upload this date. */
  allowDuplicateDate?: boolean;
}

export type CommitBatchResult =
  | {
      ok: true;
      gameNight: GameNight;
      newPlayerCount: number;
      returningPlayerCount: number;
      refreshedPlayerCount: number;
    }
  | { ok: false; reason: "duplicate-game-night"; existing: GameNight };

/**
 * The proxy already refuses a non-admin request to `/upload`, and this checks
 * again anyway.
 *
 * Server actions are POSTs to a route path, so they inherit that protection —
 * but "inherit" is doing load-bearing work in that sentence. One matcher edit,
 * one route group refactor, and these become the only thing standing between
 * a viewer credential and a rewritten roster. Authorisation next to the write
 * cannot be refactored away by accident.
 */
async function assertAdmin(): Promise<void> {
  const role = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (role !== "admin") {
    throw new Error("Not authorised: uploading requires the admin password.");
  }
}

/** Lets the upload form warn about a re-upload before any review work is done. */
export async function checkGameNightDate(gameNightDate: string): Promise<GameNight | null> {
  await assertAdmin();
  return (await findGameNightByDate(gameNightDate)) ?? null;
}

function newPlayerAndParticipation(row: IncomingRow, gameNightId: string): { player: Player; participation: Participation } {
  const now = new Date().toISOString();
  const player = buildPlayer({
    firstName: row.firstName,
    lastName: row.lastName,
    nickname: row.nickname,
    email: row.email,
    mobileNumber: row.mobileNumber,
    gender: row.gender,
    civilStatus: row.civilStatus,
    dgroupMemberStatus: row.dgroupMemberStatus,
    dgroupStatus: row.dgroupStatus,
    dgroupInterestedInJoining: row.dgroupInterestedInJoining,
    dgroupLeadingWillingToAbsorb: row.dgroupLeadingWillingToAbsorb,
    churchAffiliation: row.churchAffiliation,
    firstSeenGameNightId: gameNightId,
    firstSeenAt: now,
    lastUpdatedAt: now,
    raw: row.raw,
  });
  const participation = buildParticipation({
    playerId: player.playerId,
    gameNightId,
    sportSelected: row.sportSelected,
    skillLevel: row.skillLevel,
    isFirstParticipation: true,
    submittedAt: row.submittedAt,
    registered: true,
    dgroupStatus: row.dgroupStatus,
    dgroupInterestedInJoining: row.dgroupInterestedInJoining,
    dgroupLeadingWillingToAbsorb: row.dgroupLeadingWillingToAbsorb,
  });
  return { player, participation };
}

// A "returning" match is by definition a player who already has a Players
// row — and every Players row is created together with its first
// Participation (see newPlayerAndParticipation) — so isFirstParticipation is
// always false here; no extra read needed to confirm it.
function returningParticipation(row: IncomingRow, player: Player, gameNightId: string): Participation {
  return buildParticipation({
    playerId: player.playerId,
    gameNightId,
    sportSelected: row.sportSelected,
    skillLevel: row.skillLevel,
    isFirstParticipation: false,
    submittedAt: row.submittedAt,
    registered: true,
    dgroupStatus: row.dgroupStatus,
    dgroupInterestedInJoining: row.dgroupInterestedInJoining,
    dgroupLeadingWillingToAbsorb: row.dgroupLeadingWillingToAbsorb,
  });
}

/**
 * Returns the player rewritten with this night's answers, or null when
 * nothing they told us actually changed.
 *
 * Before this existed the ingest was append-only, so every record stayed
 * frozen at first sighting — a person who joined a DGroup in March still
 * read as "Not involved" months later, and the whole follow-up worklist
 * inherited that staleness.
 *
 * Identity (name, email) is deliberately never refreshed: those are what
 * dedup matched on, so letting a typo in a later export rewrite them would
 * silently split or merge real people.
 *
 * The caller (`recordReturning`) only invokes this when the incoming game
 * night is chronologically the latest thing on record for this player — see
 * `latestKnownDateByPlayerId` in `commitBatch`. Without that gate, uploading
 * an older night after newer ones already landed would treat stale answers
 * as "new information" and overwrite a status a later night had already
 * corrected.
 */
function refreshedPlayer(row: IncomingRow, player: Player): Player | null {
  // A blank answer on a later form means "no new information", never an
  // erasure — a skipped question must not wipe what we already know.
  const keep = <T,>(next: T | undefined, current: T): T =>
    next != null && String(next).trim() !== "" ? next : current;

  const merged: Player = {
    ...player,
    // Nickname and mobile refresh like any other answer. They are NOT
    // identity in the dedup sense — matching keys on first/last/email only
    // (lib/match.ts), so a changed nickname cannot split or merge a person.
    nickname: keep(row.nickname, player.nickname),
    mobileNumber: keep(row.mobileNumber, player.mobileNumber),
    gender: keep(row.gender, player.gender),
    civilStatus: keep(row.civilStatus, player.civilStatus),
    dgroupMemberStatus: keep(row.dgroupMemberStatus, player.dgroupMemberStatus),
    dgroupStatus: keep(row.dgroupStatus, player.dgroupStatus),
    dgroupInterestedInJoining: keep(row.dgroupInterestedInJoining, player.dgroupInterestedInJoining),
    dgroupLeadingWillingToAbsorb: keep(row.dgroupLeadingWillingToAbsorb, player.dgroupLeadingWillingToAbsorb),
    churchAffiliation: keep(row.churchAffiliation, player.churchAffiliation),
  };

  const changed =
    merged.nickname !== player.nickname ||
    merged.mobileNumber !== player.mobileNumber ||
    merged.gender !== player.gender ||
    merged.civilStatus !== player.civilStatus ||
    merged.dgroupMemberStatus !== player.dgroupMemberStatus ||
    merged.dgroupStatus !== player.dgroupStatus ||
    merged.dgroupInterestedInJoining !== player.dgroupInterestedInJoining ||
    merged.dgroupLeadingWillingToAbsorb !== player.dgroupLeadingWillingToAbsorb ||
    merged.churchAffiliation !== player.churchAffiliation;

  if (!changed) return null;
  return { ...merged, lastUpdatedAt: new Date().toISOString(), raw: row.raw };
}

/**
 * Builds every row this batch will write, entirely in memory, then commits
 * with a single append call per tab (commitBatchToSheets) — never one API
 * call per row, which would blow through Sheets' rate limits on a
 * 150-200-row weekly upload.
 */
export async function commitBatch(input: CommitBatchInput): Promise<CommitBatchResult> {
  await assertAdmin();
  // Uploading the same date twice would append a second game night and give
  // every attendee a duplicate participation row, silently doubling that
  // night's numbers. The backfill re-runs historical exports, so this guard
  // is what makes that operation safe to attempt.
  if (!input.allowDuplicateDate) {
    const existing = await findGameNightByDate(input.gameNightDate);
    if (existing) return { ok: false, reason: "duplicate-game-night", existing };
  }

  // Read players fresh (with their sheet rows) rather than trusting the
  // copies that round-tripped through the client during review.
  const [playersWithRows, existingParticipations, existingGameNights] = await Promise.all([
    listPlayersWithRows(),
    listParticipations(),
    listGameNights(),
  ]);
  const playersByIdWithRow = new Map<string, PlayerWithRow>(playersWithRows.map((p) => [p.player.playerId, p]));

  // The Player row's DGroup fields are a "latest known status" snapshot, and
  // uploads don't always arrive in chronological order — a backfill can
  // upload an older night after newer ones already landed (e.g. a
  // rediscovered export for a night that was missed the first time). Without
  // this, that older upload would read as "new information" and stomp a
  // status that a later night had already correctly updated. Each player's
  // Participation rows are the source of truth for "what's the most recent
  // game night we've actually recorded for them" regardless of upload order.
  const gameNightDateById = new Map(existingGameNights.map((gn) => [gn.gameNightId, gn.gameNightDate]));
  const latestKnownDateByPlayerId = new Map<string, string>();
  for (const p of existingParticipations) {
    const date = gameNightDateById.get(p.gameNightId);
    if (!date) continue;
    const current = latestKnownDateByPlayerId.get(p.playerId);
    if (!current || date > current) latestKnownDateByPlayerId.set(p.playerId, date);
  }

  const gameNight = buildGameNight({
    gameNightDate: input.gameNightDate,
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy || "Admin",
    sourceFilename: input.sourceFilename,
    rowCount: input.rowCount,
    autoConfirmedCount: 0,
    flaggedCount: 0,
    resolvedLinkExistingCount: 0,
    resolvedAddNewCount: 0,
    resolvedSkipCount: 0,
  });

  const newPlayers: Player[] = [];
  const participations: Participation[] = [];
  // Keyed by playerId so a player touched twice in one batch refreshes once.
  const refreshes = new Map<string, PlayerWithRow>();
  let returningPlayerCount = 0;
  let resolvedLinkExistingCount = 0;
  let resolvedAddNewCount = 0;
  let resolvedSkipCount = 0;

  function recordReturning(row: IncomingRow, playerId: string) {
    const known = refreshes.get(playerId) ?? playersByIdWithRow.get(playerId);
    if (!known) return;

    // The Participation row is always written — it's this night's own record
    // and is safe regardless of upload order. Only the Player snapshot
    // refresh is chronology-gated.
    participations.push(returningParticipation(row, known.player, gameNight.gameNightId));

    const latestKnownDate = latestKnownDateByPlayerId.get(playerId);
    const isChronologicallyCurrent = !latestKnownDate || input.gameNightDate >= latestKnownDate;
    if (!isChronologicallyCurrent) return;

    const updated = refreshedPlayer(row, known.player);
    if (updated) refreshes.set(playerId, { player: updated, sheetRow: known.sheetRow });
  }

  for (const outcome of input.autoConfirmed) {
    if (outcome.kind === "new") {
      const { player, participation } = newPlayerAndParticipation(outcome.row, gameNight.gameNightId);
      newPlayers.push(player);
      participations.push(participation);
    } else {
      recordReturning(outcome.row, outcome.player.playerId);
      returningPlayerCount += 1;
    }
  }

  for (const item of input.ambiguous) {
    const action = item.action;
    if (action.kind === "skip") {
      resolvedSkipCount += 1;
      continue;
    }
    if (action.kind === "addNew") {
      const { player, participation } = newPlayerAndParticipation(item.row, gameNight.gameNightId);
      newPlayers.push(player);
      participations.push(participation);
      resolvedAddNewCount += 1;
      continue;
    }
    const player = item.candidates.find((c) => c.playerId === action.playerId);
    if (player) {
      recordReturning(item.row, player.playerId);
      resolvedLinkExistingCount += 1;
      returningPlayerCount += 1;
    }
  }

  const finalGameNight: GameNight = {
    ...gameNight,
    autoConfirmedCount: input.autoConfirmed.length,
    flaggedCount: input.ambiguous.length,
    resolvedLinkExistingCount,
    resolvedAddNewCount,
    resolvedSkipCount,
  };

  const refreshedPlayers = [...refreshes.values()];
  await commitBatchToSheets({ gameNight: finalGameNight, newPlayers, participations, refreshedPlayers });

  return {
    ok: true,
    gameNight: finalGameNight,
    newPlayerCount: newPlayers.length,
    returningPlayerCount,
    refreshedPlayerCount: refreshedPlayers.length,
  };
}

// ---------------------------------------------------------------------------
// Attendance — the door check-in list
// ---------------------------------------------------------------------------

export interface ParseAttendanceResult {
  ok: true;
  sourceFilename: string;
  rowCount: number;
  duplicateCount: number;
  unusableRowCount: number;
  matched: { row: IncomingAttendanceRow; player: Player }[];
  ambiguous: { row: IncomingAttendanceRow; candidates: AttendanceCandidate[] }[];
}

export interface ParseAttendanceError {
  ok: false;
  reason: "missing-columns" | "empty-file";
  missingColumns?: string[];
}

export async function parseAndMatchAttendance(
  formData: FormData,
): Promise<ParseAttendanceResult | ParseAttendanceError> {
  await assertAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, reason: "empty-file" };

  const parsed = await parseAttendanceFile(await file.arrayBuffer());
  if (!parsed.ok) return { ok: false, reason: "missing-columns", missingColumns: parsed.missingColumns };

  const players = await listPlayers();

  // The night's roster is the strongest evidence a bare name can be matched
  // against, so it is fetched before ranking rather than after.
  const gameNightDate = String(formData.get("gameNightDate") ?? "");
  const night = gameNightDate ? await findGameNightWithRow(gameNightDate) : undefined;
  const registeredPlayerIds = new Set<string>();
  const sportByPlayerId = new Map<string, string>();
  if (night) {
    for (const { participation } of await listParticipationsWithRows()) {
      if (participation.gameNightId !== night.gameNight.gameNightId) continue;
      registeredPlayerIds.add(participation.playerId);
      sportByPlayerId.set(participation.playerId, participation.sportSelected);
    }
  }

  const outcomes = matchAttendance(parsed.rows, players, { registeredPlayerIds, sportByPlayerId });

  return {
    ok: true,
    sourceFilename: file.name,
    rowCount: parsed.rows.length,
    duplicateCount: parsed.duplicateCount,
    unusableRowCount: parsed.unusableRowCount,
    matched: outcomes.filter((o) => o.kind === "matched").map((o) => ({ row: o.row, player: o.player })),
    ambiguous: outcomes
      .filter((o) => o.kind === "ambiguous")
      .map((o) => ({ row: o.row, candidates: o.candidates })),
  };
}

export interface CommitAttendanceInput {
  gameNightDate: string;
  sourceFilename: string;
  rowCount: number;
  /** Auto-matched plus anything the admin linked in review. */
  present: { row: IncomingAttendanceRow; playerId: string }[];
  allowReupload?: boolean;
}

export type CommitAttendanceResult =
  | {
      ok: true;
      gameNight: GameNight;
      registered: number;
      attended: number;
      noShows: number;
      walkIns: number;
    }
  | { ok: false; reason: "no-game-night"; gameNightDate: string }
  | { ok: false; reason: "already-uploaded"; existing: GameNight };

/** Lets the form warn before any review work that the night is missing or done. */
export async function checkAttendanceNight(
  gameNightDate: string,
): Promise<{ found: false } | { found: true; gameNight: GameNight; alreadyUploaded: boolean }> {
  await assertAdmin();
  const hit = await findGameNightWithRow(gameNightDate);
  if (!hit) return { found: false };
  return { found: true, gameNight: hit.gameNight, alreadyUploaded: !!hit.gameNight.attendanceUploadedAt };
}

/**
 * Marks who actually came. Attendance never creates a game night — it attaches
 * to one that registration already established, because without that night's
 * registrations there is nobody to match a bare name against.
 */
export async function commitAttendance(input: CommitAttendanceInput): Promise<CommitAttendanceResult> {
  await assertAdmin();
  const hit = await findGameNightWithRow(input.gameNightDate);
  if (!hit) return { ok: false, reason: "no-game-night", gameNightDate: input.gameNightDate };
  if (hit.gameNight.attendanceUploadedAt && !input.allowReupload) {
    return { ok: false, reason: "already-uploaded", existing: hit.gameNight };
  }

  const all = await listParticipationsWithRows();
  const thisNight = all.filter((p) => p.participation.gameNightId === hit.gameNight.gameNightId);
  const byPlayerId = new Map(thisNight.map((p) => [p.participation.playerId, p]));

  const updated: ParticipationWithRow[] = [];
  const walkIns: Participation[] = [];

  for (const { row, playerId } of input.present) {
    const existing = byPlayerId.get(playerId);
    if (existing) {
      updated.push({
        sheetRow: existing.sheetRow,
        participation: {
          ...existing.participation,
          attendedAt: row.checkedInAt,
          attendedSport: row.sport,
        },
      });
      continue;
    }
    // Checked in without registering. The sport comes from the door list
    // because there is no registration to take one from.
    walkIns.push(
      buildParticipation({
        playerId,
        gameNightId: hit.gameNight.gameNightId,
        sportSelected: row.sport ?? "Unspecified",
        isFirstParticipation: false,
        submittedAt: "",
        registered: false,
        attendedAt: row.checkedInAt,
        attendedSport: row.sport,
      }),
    );
  }

  const attended = updated.length + walkIns.length;
  const gameNight: GameNight = {
    ...hit.gameNight,
    attendanceUploadedAt: new Date().toISOString(),
    attendanceSourceFilename: input.sourceFilename,
    attendanceCount: attended,
  };

  await commitAttendanceToSheets({
    gameNight,
    gameNightSheetRow: hit.sheetRow,
    updated,
    walkIns,
  });

  return {
    ok: true,
    gameNight,
    registered: thisNight.length,
    attended,
    noShows: thisNight.length - updated.length,
    walkIns: walkIns.length,
  };
}
