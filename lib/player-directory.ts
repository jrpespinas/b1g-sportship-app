// Data assembly for the player directory (list + detail). Read-only, same as
// dashboard-metrics.ts — fetches once, computes in memory, never re-queries
// Sheets per keystroke (that's the client-side filtering's whole point).

import { getPlayer, listGameNights, listParticipations, listPlayers } from "./store";
import { getDGroupCategory, getPlayerSegment, isWillingToAbsorb } from "./dgroup";
import type { DGroupCategory, DGroupSegment } from "./dgroup";
import { buildMovements, summarize, type MovementSummary, type PlayerMovement } from "./movement";
import type { GameNight, Participation, Player } from "./types";

export interface PlayerSummary {
  player: Player;
  dgroupCategory: DGroupCategory;
  /** The four-way bucket the dashboard counts in. Leaders folds D12 in. */
  segment: DGroupSegment;
  willingToAbsorb: boolean;
  gameNightCount: number;
  lastSeenDate?: string;
  firstSeenDate?: string;
  /**
   * Game nights that have run since this person last came — 0 means they were
   * at the most recent one. Deliberately counted in *nights*, not days: the
   * season has real two- and three-week gaps, so "three weeks ago" says
   * nothing about whether someone has actually stopped turning up.
   */
  gameNightsSinceLastSeen?: number;
  /** Present only for the few who ever changed standing — 32 of 1080. */
  movement?: MovementSummary;
}

export async function getPlayerDirectoryList(): Promise<PlayerSummary[]> {
  const [players, participations, gameNights] = await Promise.all([
    listPlayers(),
    listParticipations(),
    listGameNights(),
  ]);

  const dateByNightId = new Map(gameNights.map((gn) => [gn.gameNightId, gn.gameNightDate]));
  const seasonDates = [...new Set(gameNights.map((gn) => gn.gameNightDate))].sort();
  const seasonIndexByDate = new Map(seasonDates.map((date, i) => [date, i]));

  const movements = buildMovements(participations, gameNights);

  const countByPlayer = new Map<string, number>();
  const lastByPlayer = new Map<string, string>();
  const firstByPlayer = new Map<string, string>();

  for (const p of participations) {
    countByPlayer.set(p.playerId, (countByPlayer.get(p.playerId) ?? 0) + 1);

    const date = dateByNightId.get(p.gameNightId);
    if (!date) continue;
    const last = lastByPlayer.get(p.playerId);
    if (!last || date > last) lastByPlayer.set(p.playerId, date);
    const first = firstByPlayer.get(p.playerId);
    if (!first || date < first) firstByPlayer.set(p.playerId, date);
  }

  return players.map((player) => {
    const lastSeenDate = lastByPlayer.get(player.playerId);
    const seasonIndex = lastSeenDate ? seasonIndexByDate.get(lastSeenDate) : undefined;

    return {
      player,
      dgroupCategory: getDGroupCategory(player),
      segment: getPlayerSegment(player),
      willingToAbsorb: isWillingToAbsorb(player.dgroupLeadingWillingToAbsorb),
      gameNightCount: countByPlayer.get(player.playerId) ?? 0,
      lastSeenDate,
      firstSeenDate: firstByPlayer.get(player.playerId),
      gameNightsSinceLastSeen:
        seasonIndex == null ? undefined : seasonDates.length - 1 - seasonIndex,
      movement: summarize(movements.get(player.playerId)),
    };
  });
}

export interface ParticipationHistoryEntry {
  participation: Participation;
  gameNight: GameNight | undefined;
}

export interface PlayerDetail {
  player: Player;
  dgroupCategory: DGroupCategory;
  history: ParticipationHistoryEntry[];
  movement: PlayerMovement | undefined;
}

export async function getPlayerDetail(playerId: string): Promise<PlayerDetail | undefined> {
  const player = await getPlayer(playerId);
  if (!player) return undefined;

  const [participations, gameNights] = await Promise.all([listParticipations(), listGameNights()]);
  const gameNightById = new Map(gameNights.map((gn) => [gn.gameNightId, gn]));

  const history = participations
    .filter((p) => p.playerId === playerId)
    .map((participation) => ({ participation, gameNight: gameNightById.get(participation.gameNightId) }))
    .sort((a, b) => (b.gameNight?.gameNightDate ?? "").localeCompare(a.gameNight?.gameNightDate ?? ""));

  return {
    player,
    dgroupCategory: getDGroupCategory(player),
    history,
    movement: buildMovements(participations, gameNights).get(playerId),
  };
}
