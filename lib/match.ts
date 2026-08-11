import { normalizeEmail, normalizeName, nameSimilarity, FUZZY_MATCH_THRESHOLD } from "./fuzzy";
import type { IncomingRow, MatchOutcome, Player } from "./types";

export interface MatchResult {
  outcomes: MatchOutcome[];
  withinBatchDuplicatesCollapsed: number;
}

function collapseWithinBatchDuplicates(rows: IncomingRow[]): { rows: IncomingRow[]; collapsed: number } {
  const seenEmails = new Set<string>();
  const kept: IncomingRow[] = [];
  let collapsed = 0;

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email) {
      kept.push(row);
      continue;
    }
    if (seenEmails.has(email)) {
      collapsed += 1;
      continue;
    }
    seenEmails.add(email);
    kept.push(row);
  }

  return { rows: kept, collapsed };
}

/** Feature 1 + 2 of docs/spec/02-player-inventory.md, in one pass. */
export function matchRowsAgainstHistory(rows: IncomingRow[], existingPlayers: Player[]): MatchResult {
  const { rows: dedupedRows, collapsed } = collapseWithinBatchDuplicates(rows);

  const outcomes: MatchOutcome[] = dedupedRows.map((row) => {
    const email = normalizeEmail(row.email);
    if (email) {
      const exact = existingPlayers.find((p) => normalizeEmail(p.email) === email);
      if (exact) return { kind: "returning", row, player: exact };
    }

    const incomingName = normalizeName(row.firstName, row.lastName);
    const candidates = existingPlayers
      .map((player) => ({
        player,
        score: nameSimilarity(incomingName, normalizeName(player.firstName, player.lastName)),
      }))
      .filter((c) => c.score >= FUZZY_MATCH_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((c) => c.player);

    if (candidates.length > 0) return { kind: "ambiguous", row, candidates };
    return { kind: "new", row };
  });

  return { outcomes, withinBatchDuplicatesCollapsed: collapsed };
}
