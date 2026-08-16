import {
  normalizeEmail,
  normalizeName,
  normalizeSurname,
  nameSimilarity,
  FUZZY_MATCH_THRESHOLD,
} from "./fuzzy";
import { normalizeMobile } from "./candidate-evidence";
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
    const incomingMobile = normalizeMobile(row.mobileNumber);
    const incomingSurname = normalizeSurname(row.lastName);

    const candidates = existingPlayers
      .map((player) => ({
        player,
        score: nameSimilarity(incomingName, normalizeName(player.firstName, player.lastName)),
        // Same phone AND same surname. Spelling misses a whole class of
        // duplicate — "Sabugo, Jm" scores 0.77 against "Sabugo, Jomar",
        // "Diaz, Glai" 0.83 against "Diaz, Glaiza" — and both sat in the
        // roster as separate people. The surname guard is what keeps the
        // rule off the couples and housemates who share one handset; all
        // three such pairs measured have different surnames.
        sharesMobile:
          !!incomingMobile &&
          !!incomingSurname &&
          incomingMobile === normalizeMobile(player.mobileNumber) &&
          incomingSurname === normalizeSurname(player.lastName),
      }))
      .filter((c) => c.sharesMobile || c.score >= FUZZY_MATCH_THRESHOLD)
      // A matching phone outranks any spelling: the reviewer should meet the
      // near-certain candidate first, not the closest-spelled one.
      .sort((a, b) => Number(b.sharesMobile) - Number(a.sharesMobile) || b.score - a.score)
      .slice(0, 3)
      .map((c) => c.player);

    if (candidates.length > 0) return { kind: "ambiguous", row, candidates };
    return { kind: "new", row };
  });

  return { outcomes, withinBatchDuplicatesCollapsed: collapsed };
}
