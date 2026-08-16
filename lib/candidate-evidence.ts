import type { GameNight, Participation } from "./types";

/**
 * The last ten digits, or "" when there are not ten of them.
 *
 * The roster carries the same phone three ways — `09xxxxxxxxx` (281 rows),
 * `639xxxxxxxxx` (692) and a bare `9xxxxxxxxx` (29) — because the form takes
 * free text. Anything that compares the strings as typed calls one phone
 * three different numbers. The last ten digits are invariant across all
 * three, and short of that there is nothing worth comparing: a four-digit
 * fragment would match strangers.
 */
export function normalizeMobile(value: string | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

export type MobileVerdict = "same" | "differs" | "unknown";

/** "unknown" when either side is missing — absence is not disagreement. */
export function compareMobile(a: string | undefined, b: string | undefined): MobileVerdict {
  const left = normalizeMobile(a);
  const right = normalizeMobile(b);
  if (!left || !right) return "unknown";
  return left === right ? "same" : "differs";
}

/** Shown as `·······4821`, so two numbers can be compared without printing one. */
export function maskMobile(value: string | undefined): string | undefined {
  const normalized = normalizeMobile(value);
  return normalized ? `·······${normalized.slice(-4)}` : undefined;
}

/**
 * What a candidate's record looks like from the outside — the context a
 * reviewer needs to tell an established regular from a one-off row that was
 * itself probably a mis-keyed duplicate.
 */
export interface PlayerHistory {
  nightsRegistered: number;
  nightsAttended: number;
  lastRegisteredDate?: string;
  lastAttendedDate?: string;
  frequentSport?: string;
}

/**
 * Histories for the given players only.
 *
 * Scoped to the candidate ids rather than the whole roster because a review
 * batch touches a few dozen players out of 1,080, and the result crosses the
 * server/client boundary — sending 1,080 histories to render six cards would
 * be most of a megabyte for nothing.
 */
export function buildHistories(
  playerIds: Iterable<string>,
  participations: Participation[],
  gameNights: GameNight[],
): Record<string, PlayerHistory> {
  const wanted = new Set(playerIds);
  if (wanted.size === 0) return {};

  const dateOf = new Map(gameNights.map((night) => [night.gameNightId, night.gameNightDate]));
  const sportTally = new Map<string, Map<string, number>>();
  const histories: Record<string, PlayerHistory> = {};

  for (const participation of participations) {
    if (!wanted.has(participation.playerId)) continue;

    const history = (histories[participation.playerId] ??= {
      nightsRegistered: 0,
      nightsAttended: 0,
    });
    const date = dateOf.get(participation.gameNightId);

    // A walk-in has a participation row without having registered, so the two
    // counts move independently — see the `registered` flag in types.ts.
    if (participation.registered) {
      history.nightsRegistered += 1;
      if (date && date > (history.lastRegisteredDate ?? "")) history.lastRegisteredDate = date;
    }
    if (participation.attendedAt) {
      history.nightsAttended += 1;
      if (date && date > (history.lastAttendedDate ?? "")) history.lastAttendedDate = date;
    }

    const sport = participation.attendedSport || participation.sportSelected;
    if (sport) {
      const tally = sportTally.get(participation.playerId) ?? new Map<string, number>();
      tally.set(sport, (tally.get(sport) ?? 0) + 1);
      sportTally.set(participation.playerId, tally);
    }
  }

  for (const [playerId, tally] of sportTally) {
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) histories[playerId].frequentSport = top[0];
  }

  return histories;
}
