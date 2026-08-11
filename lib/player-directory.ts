// Data assembly for the player directory (list + detail). Read-only, same as
// dashboard-metrics.ts — fetches once, computes in memory, never re-queries
// Sheets per keystroke (that's the client-side filtering's whole point).

import { getPlayer, listGameNights, listParticipations, listPlayers } from "./store";
import { getDGroupCategory } from "./dgroup";
import type { DGroupCategory } from "./dgroup";
import type { GameNight, Participation, Player } from "./types";

export interface PlayerSummary {
  player: Player;
  dgroupCategory: DGroupCategory;
  gameNightCount: number;
}

export async function getPlayerDirectoryList(): Promise<PlayerSummary[]> {
  const [players, participations] = await Promise.all([listPlayers(), listParticipations()]);
  const countByPlayer = new Map<string, number>();
  for (const p of participations) {
    countByPlayer.set(p.playerId, (countByPlayer.get(p.playerId) ?? 0) + 1);
  }
  return players.map((player) => ({
    player,
    dgroupCategory: getDGroupCategory(player),
    gameNightCount: countByPlayer.get(player.playerId) ?? 0,
  }));
}

export interface ParticipationHistoryEntry {
  participation: Participation;
  gameNight: GameNight | undefined;
}

export interface PlayerDetail {
  player: Player;
  dgroupCategory: DGroupCategory;
  history: ParticipationHistoryEntry[];
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

  return { player, dgroupCategory: getDGroupCategory(player), history };
}
