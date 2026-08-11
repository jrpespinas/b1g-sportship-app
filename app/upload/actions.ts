"use server";

import { parseRosterFile } from "@/lib/parse";
import { matchRowsAgainstHistory } from "@/lib/match";
import {
  buildGameNight,
  buildParticipation,
  buildPlayer,
  commitBatchToSheets,
  findGameNightByDate,
  listPlayers,
  listPlayersWithRows,
  type PlayerWithRow,
} from "@/lib/store";
import type { GameNight, IncomingRow, MatchOutcome, Participation, Player, ReviewAction } from "@/lib/types";

export interface ParseAndMatchResult {
  ok: true;
  sourceFilename: string;
  rowCount: number;
  unusableRowCount: number;
  withinBatchDuplicatesCollapsed: number;
  autoConfirmed: Extract<MatchOutcome, { kind: "new" | "returning" }>[];
  ambiguous: Extract<MatchOutcome, { kind: "ambiguous" }>[];
}

export interface ParseAndMatchError {
  ok: false;
  reason: "missing-columns" | "empty-file";
  missingColumns?: string[];
}

export async function parseAndMatch(formData: FormData): Promise<ParseAndMatchResult | ParseAndMatchError> {
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

  return {
    ok: true,
    sourceFilename: file.name,
    rowCount: parsed.rows.length,
    unusableRowCount: parsed.unusableRowCount,
    withinBatchDuplicatesCollapsed,
    autoConfirmed,
    ambiguous,
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

/** Lets the upload form warn about a re-upload before any review work is done. */
export async function checkGameNightDate(gameNightDate: string): Promise<GameNight | null> {
  return (await findGameNightByDate(gameNightDate)) ?? null;
}

function newPlayerAndParticipation(row: IncomingRow, gameNightId: string): { player: Player; participation: Participation } {
  const now = new Date().toISOString();
  const player = buildPlayer({
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
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
 */
function refreshedPlayer(row: IncomingRow, player: Player): Player | null {
  // A blank answer on a later form means "no new information", never an
  // erasure — a skipped question must not wipe what we already know.
  const keep = <T,>(next: T | undefined, current: T): T =>
    next != null && String(next).trim() !== "" ? next : current;

  const merged: Player = {
    ...player,
    gender: keep(row.gender, player.gender),
    civilStatus: keep(row.civilStatus, player.civilStatus),
    dgroupMemberStatus: keep(row.dgroupMemberStatus, player.dgroupMemberStatus),
    dgroupStatus: keep(row.dgroupStatus, player.dgroupStatus),
    dgroupInterestedInJoining: keep(row.dgroupInterestedInJoining, player.dgroupInterestedInJoining),
    dgroupLeadingWillingToAbsorb: keep(row.dgroupLeadingWillingToAbsorb, player.dgroupLeadingWillingToAbsorb),
    churchAffiliation: keep(row.churchAffiliation, player.churchAffiliation),
  };

  const changed =
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
  const playersByIdWithRow = new Map<string, PlayerWithRow>(
    (await listPlayersWithRows()).map((p) => [p.player.playerId, p]),
  );

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
    participations.push(returningParticipation(row, known.player, gameNight.gameNightId));
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
