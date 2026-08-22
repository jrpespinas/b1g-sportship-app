// Google Sheets is the system of record (docs/spec/01-data-model.md). This
// file is the only place that knows the three tabs exist — everything above
// it (server actions, dashboard metrics) sees plain async functions over
// Player/GameNight/Participation, same shape as the in-memory mock it
// replaces. lib/sheets.ts does the actual row <-> object translation.

import "server-only";
import { nanoid } from "nanoid";
import { appendRows, readTab, revalidateSheets, updateRows } from "./sheets";
import { normalizeEmail } from "./fuzzy";
import type { GameNight, Participation, Player } from "./types";

const PLAYERS_TAB = "Players";
const GAME_NIGHTS_TAB = "Game Nights";
const PARTICIPATIONS_TAB = "Participations";

const PLAYER_HEADERS = [
  "player_id", "first_name", "last_name", "nickname", "email", "mobile_number",
  "gender", "civil_status", "dgroup_member_status", "dgroup_status",
  "dgroup_interested_in_joining", "dgroup_leading_willing_to_absorb", "church_affiliation",
  "first_seen_game_night_id", "first_seen_at", "last_updated_at", "raw_json",
];

const GAME_NIGHT_HEADERS = [
  "game_night_id", "game_night_date", "uploaded_at", "uploaded_by", "source_filename",
  "row_count", "auto_confirmed_count", "flagged_count",
  "resolved_link_existing_count", "resolved_add_new_count", "resolved_skip_count",
  // Set only when a door check-in list has been uploaded for this night.
  // Blank means "no file yet", which is NOT the same as "nobody came".
  "attendance_uploaded_at", "attendance_source_filename", "attendance_count",
  // The linked door sheet, when a night was imported by link rather than file.
  "attendance_sheet_url",
];

const PARTICIPATION_HEADERS = [
  "participation_id", "player_id", "game_night_id", "sport_selected", "skill_level",
  "is_first_participation", "submitted_at",
  // Point-in-time discipleship status, as answered on this night's form.
  // Added 2026-08-11 — rows written before then leave these blank.
  "dgroup_status", "dgroup_interested_in_joining", "dgroup_leading_willing_to_absorb",
  // Door check-in, added 2026-08-12. `registered` is TRUE on every row
  // written before then — they all came from a registration file.
  "attended_at", "attended_sport", "registered",
];

function rowToPlayer(row: Record<string, string>): Player {
  let raw: Record<string, string> = {};
  try {
    raw = row.raw_json ? JSON.parse(row.raw_json) : {};
  } catch {
    raw = {};
  }
  return {
    playerId: row.player_id,
    firstName: row.first_name,
    lastName: row.last_name,
    // `Nickname` and `Mobile Number` were never added to COLUMN_MAP, so the
    // parser swept both into `raw` and left these columns blank on every row
    // ever written (0 of 1081 for nickname, though 1080 of them answered).
    // The values are there; read through to them rather than requiring a
    // re-upload of the whole season to surface data we already hold. Both are
    // mapped properly for new uploads as of 2026-08-12 — this fallback is for
    // everything written before that.
    nickname: row.nickname || raw["Nickname"] || undefined,
    email: row.email,
    mobileNumber: row.mobile_number || raw["Mobile Number"] || undefined,
    gender: row.gender || undefined,
    civilStatus: row.civil_status || undefined,
    dgroupMemberStatus: (row.dgroup_member_status || undefined) as Player["dgroupMemberStatus"],
    dgroupStatus: (row.dgroup_status || undefined) as Player["dgroupStatus"],
    dgroupInterestedInJoining: (row.dgroup_interested_in_joining || undefined) as Player["dgroupInterestedInJoining"],
    dgroupLeadingWillingToAbsorb: row.dgroup_leading_willing_to_absorb || undefined,
    churchAffiliation: row.church_affiliation || undefined,
    firstSeenGameNightId: row.first_seen_game_night_id,
    firstSeenAt: row.first_seen_at,
    lastUpdatedAt: row.last_updated_at,
    raw,
  };
}

function playerToRow(player: Player): Record<string, unknown> {
  return {
    player_id: player.playerId,
    first_name: player.firstName,
    last_name: player.lastName,
    nickname: player.nickname ?? "",
    email: player.email,
    mobile_number: player.mobileNumber ?? "",
    gender: player.gender ?? "",
    civil_status: player.civilStatus ?? "",
    dgroup_member_status: player.dgroupMemberStatus ?? "",
    dgroup_status: player.dgroupStatus ?? "",
    dgroup_interested_in_joining: player.dgroupInterestedInJoining ?? "",
    dgroup_leading_willing_to_absorb: player.dgroupLeadingWillingToAbsorb ?? "",
    church_affiliation: player.churchAffiliation ?? "",
    first_seen_game_night_id: player.firstSeenGameNightId,
    first_seen_at: player.firstSeenAt,
    last_updated_at: player.lastUpdatedAt,
    raw_json: player.raw,
  };
}

function rowToGameNight(row: Record<string, string>): GameNight {
  return {
    gameNightId: row.game_night_id,
    gameNightDate: row.game_night_date,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
    sourceFilename: row.source_filename,
    rowCount: Number(row.row_count || 0),
    autoConfirmedCount: Number(row.auto_confirmed_count || 0),
    flaggedCount: Number(row.flagged_count || 0),
    resolvedLinkExistingCount: Number(row.resolved_link_existing_count || 0),
    resolvedAddNewCount: Number(row.resolved_add_new_count || 0),
    resolvedSkipCount: Number(row.resolved_skip_count || 0),
    attendanceUploadedAt: row.attendance_uploaded_at || undefined,
    attendanceSourceFilename: row.attendance_source_filename || undefined,
    attendanceCount: row.attendance_uploaded_at ? Number(row.attendance_count || 0) : undefined,
    attendanceSheetUrl: row.attendance_sheet_url || undefined,
  };
}

function gameNightToRow(gn: GameNight): Record<string, unknown> {
  return {
    game_night_id: gn.gameNightId,
    game_night_date: gn.gameNightDate,
    uploaded_at: gn.uploadedAt,
    uploaded_by: gn.uploadedBy,
    source_filename: gn.sourceFilename,
    row_count: gn.rowCount,
    auto_confirmed_count: gn.autoConfirmedCount,
    flagged_count: gn.flaggedCount,
    resolved_link_existing_count: gn.resolvedLinkExistingCount,
    resolved_add_new_count: gn.resolvedAddNewCount,
    resolved_skip_count: gn.resolvedSkipCount,
    attendance_uploaded_at: gn.attendanceUploadedAt ?? "",
    attendance_source_filename: gn.attendanceSourceFilename ?? "",
    attendance_count: gn.attendanceCount ?? "",
    attendance_sheet_url: gn.attendanceSheetUrl ?? "",
  };
}

function rowToParticipation(row: Record<string, string>): Participation {
  return {
    participationId: row.participation_id,
    playerId: row.player_id,
    gameNightId: row.game_night_id,
    sportSelected: row.sport_selected,
    skillLevel: row.skill_level || undefined,
    isFirstParticipation: row.is_first_participation === "TRUE",
    submittedAt: row.submitted_at,
    dgroupStatus: (row.dgroup_status || undefined) as Participation["dgroupStatus"],
    dgroupInterestedInJoining: (row.dgroup_interested_in_joining || undefined) as Participation["dgroupInterestedInJoining"],
    dgroupLeadingWillingToAbsorb: row.dgroup_leading_willing_to_absorb || undefined,
    attendedAt: row.attended_at || undefined,
    attendedSport: row.attended_sport || undefined,
    // Every row written before attendance existed came from a registration
    // file, so a blank here reads as registered rather than as a walk-in.
    registered: row.registered !== "FALSE",
  };
}

function participationToRow(p: Participation): Record<string, unknown> {
  return {
    participation_id: p.participationId,
    player_id: p.playerId,
    game_night_id: p.gameNightId,
    sport_selected: p.sportSelected,
    skill_level: p.skillLevel ?? "",
    is_first_participation: p.isFirstParticipation,
    submitted_at: p.submittedAt,
    dgroup_status: p.dgroupStatus ?? "",
    dgroup_interested_in_joining: p.dgroupInterestedInJoining ?? "",
    dgroup_leading_willing_to_absorb: p.dgroupLeadingWillingToAbsorb ?? "",
    attended_at: p.attendedAt ?? "",
    attended_sport: p.attendedSport ?? "",
    registered: p.registered ? "TRUE" : "FALSE",
  };
}

export async function listPlayers(): Promise<Player[]> {
  const rows = await readTab(PLAYERS_TAB);
  return rows.map((r) => rowToPlayer(r.row));
}

export async function listGameNights(): Promise<GameNight[]> {
  const rows = await readTab(GAME_NIGHTS_TAB);
  return rows.map((r) => rowToGameNight(r.row));
}

export async function listParticipations(): Promise<Participation[]> {
  const rows = await readTab(PARTICIPATIONS_TAB);
  return rows.map((r) => rowToParticipation(r.row));
}

export interface PlayerWithRow {
  player: Player;
  sheetRow: number;
}

/**
 * Players plus their 1-indexed sheet row. Only the ingest flow needs this —
 * it's how a returning player's row gets refreshed in place instead of the
 * append-only behaviour that left every record frozen at first sighting.
 */
export async function listPlayersWithRows(): Promise<PlayerWithRow[]> {
  const rows = await readTab(PLAYERS_TAB);
  return rows.map((r) => ({ player: rowToPlayer(r.row), sheetRow: r.sheetRow }));
}

/** Existing game night for a date, if any — the guard against double-upload. */
export async function findGameNightByDate(gameNightDate: string): Promise<GameNight | undefined> {
  const nights = await listGameNights();
  return nights.find((gn) => gn.gameNightDate === gameNightDate);
}

export async function findPlayerByEmail(email: string): Promise<Player | undefined> {
  const normalized = normalizeEmail(email);
  const players = await listPlayers();
  return players.find((p) => normalizeEmail(p.email) === normalized);
}

export async function getPlayer(playerId: string): Promise<Player | undefined> {
  const players = await listPlayers();
  return players.find((p) => p.playerId === playerId);
}

/** Builds a new Player object but does not write it — callers batch writes. */
export function buildPlayer(input: Omit<Player, "playerId">): Player {
  return { ...input, playerId: `player_${nanoid(8)}` };
}

/** Builds a new Participation object but does not write it — callers batch writes. */
export function buildParticipation(input: Omit<Participation, "participationId">): Participation {
  return { ...input, participationId: `part_${nanoid(8)}` };
}

export interface ParticipationWithRow {
  participation: Participation;
  sheetRow: number;
}

/** Row numbers included, so a check-in can be written onto an existing row. */
export async function listParticipationsWithRows(): Promise<ParticipationWithRow[]> {
  const rows = await readTab(PARTICIPATIONS_TAB);
  return rows.map((r) => ({ participation: rowToParticipation(r.row), sheetRow: r.sheetRow }));
}

export async function findGameNightWithRow(
  gameNightDate: string,
): Promise<{ gameNight: GameNight; sheetRow: number } | undefined> {
  const rows = await readTab(GAME_NIGHTS_TAB);
  const hit = rows.find((r) => r.row.game_night_date === gameNightDate);
  return hit ? { gameNight: rowToGameNight(hit.row), sheetRow: hit.sheetRow } : undefined;
}

/**
 * Marks a night's check-ins. Three writes at most, never one per person:
 * existing rows are updated in place, walk-ins are appended, and the game
 * night's own row records that a file arrived at all.
 */
/**
 * Points a night at the sheet its door check-ins land in.
 *
 * Deliberately separate from importing. A link attached on Tuesday for a night
 * that happens on Friday has nothing to import yet, and forcing the two into
 * one action is what made attaching a live sheet impossible: the import
 * refuses an empty sheet — correctly, since a night recorded with zero
 * arrivals reads forever as "everybody stayed home" — so there was no way to
 * say "remember this link, I will import it later".
 *
 * Writes only the URL. `attendance_uploaded_at` stays empty, so every
 * show-up calculation still treats the night as one with no check-in list,
 * which is exactly what it is until the night has happened.
 */
export async function setAttendanceSheetUrl(
  gameNightId: string,
  url: string,
): Promise<GameNight | undefined> {
  const rows = await readTab(GAME_NIGHTS_TAB);
  const hit = rows.find((r) => r.row.game_night_id === gameNightId);
  if (!hit) return undefined;

  const gameNight: GameNight = { ...rowToGameNight(hit.row), attendanceSheetUrl: url || undefined };
  await updateRows(GAME_NIGHTS_TAB, GAME_NIGHT_HEADERS, [
    { sheetRow: hit.sheetRow, row: gameNightToRow(gameNight) },
  ]);
  revalidateSheets();
  return gameNight;
}

export async function commitAttendanceToSheets(input: {
  gameNight: GameNight;
  gameNightSheetRow: number;
  updated: ParticipationWithRow[];
  walkIns: Participation[];
}): Promise<void> {
  await Promise.all([
    updateRows(GAME_NIGHTS_TAB, GAME_NIGHT_HEADERS, [
      { sheetRow: input.gameNightSheetRow, row: gameNightToRow(input.gameNight) },
    ]),
    input.updated.length > 0
      ? updateRows(
          PARTICIPATIONS_TAB,
          PARTICIPATION_HEADERS,
          input.updated.map((u) => ({ sheetRow: u.sheetRow, row: participationToRow(u.participation) })),
        )
      : Promise.resolve(),
    input.walkIns.length > 0
      ? appendRows(PARTICIPATIONS_TAB, PARTICIPATION_HEADERS, input.walkIns.map(participationToRow))
      : Promise.resolve(),
  ]);

  // The rows just changed; drop the cached reads so the next page
  // render sees this upload instead of the pre-upload snapshot.
  revalidateSheets();
}

export function buildGameNight(input: Omit<GameNight, "gameNightId">): GameNight {
  return { ...input, gameNightId: `gn_${nanoid(8)}` };
}

/**
 * Writes a whole batch in four calls total, not one per row: three appends
 * plus one batched in-place refresh of returning players' records.
 *
 * The refresh and the player append both target the Players tab but never
 * overlapping ranges — appends land past the last row, updates rewrite rows
 * that already exist and never change the row count — so running them
 * together is safe.
 */
export async function commitBatchToSheets(input: {
  gameNight: GameNight;
  newPlayers: Player[];
  participations: Participation[];
  refreshedPlayers?: PlayerWithRow[];
}): Promise<void> {
  await Promise.all([
    appendRows(GAME_NIGHTS_TAB, GAME_NIGHT_HEADERS, [gameNightToRow(input.gameNight)]),
    appendRows(PLAYERS_TAB, PLAYER_HEADERS, input.newPlayers.map(playerToRow)),
    appendRows(PARTICIPATIONS_TAB, PARTICIPATION_HEADERS, input.participations.map(participationToRow)),
    updateRows(
      PLAYERS_TAB,
      PLAYER_HEADERS,
      (input.refreshedPlayers ?? []).map((u) => ({ sheetRow: u.sheetRow, row: playerToRow(u.player) })),
    ),
  ]);

  // The rows just changed; drop the cached reads so the next page
  // render sees this upload instead of the pre-upload snapshot.
  revalidateSheets();
}
