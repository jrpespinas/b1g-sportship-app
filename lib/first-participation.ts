// Who was a first-timer on which night, decided from history alone.
//
// The rule: a person's first night is the earliest game night, by date, on
// which they appear at all — registered or walked in. Every later night is a
// return, whatever they ticked on the form ("Is this your first time?" is
// self-reported and never read).
//
// This used to be decided once, at upload, against whatever the Sheet held at
// that moment. Uploads do not arrive in date order — Apr 25 landed after Aug 1
// during the backfill — so the people who first came on Apr 25 were already
// "known" from later nights and recorded as returnees, while their first-timer
// mark stayed on the later night. Measured 2026-10-27: 85 rows wrong, Apr 25
// showing 28 first-timers against a true 60. Deriving on read makes upload
// order irrelevant.
//
// scripts/fix-first-participation.mjs applies the same rule to the stored
// `is_first_participation` column and must stay in step with this file.

import type { GameNight, Participation } from "./types";

/**
 * Returns the participations with `isFirstParticipation` recomputed. Order is
 * preserved, so callers that pair rows with sheet row numbers stay aligned.
 *
 * Exactly one row per person is marked. When someone has two rows on their
 * first night (a double form submission under two emails), the registered row
 * wins, then sheet order — so a duplicate can never count one person twice.
 */
export function withDerivedFirstParticipation<T extends Participation>(
  participations: T[],
  gameNights: GameNight[],
): T[] {
  const dateById = new Map(gameNights.map((gn) => [gn.gameNightId, gn.gameNightDate]));

  const firstByPlayer = new Map<string, { index: number; date: string; registered: boolean }>();
  participations.forEach((p, index) => {
    const date = dateById.get(p.gameNightId);
    if (!date) return;
    const current = firstByPlayer.get(p.playerId);
    const earlier = !current || date < current.date;
    const sameNightButRegistered = !!current && date === current.date && p.registered && !current.registered;
    if (earlier || sameNightButRegistered) {
      firstByPlayer.set(p.playerId, { index, date, registered: p.registered });
    }
  });

  return participations.map((p, index) => {
    const isFirstParticipation = firstByPlayer.get(p.playerId)?.index === index;
    return p.isFirstParticipation === isFirstParticipation ? p : { ...p, isFirstParticipation };
  });
}

/**
 * Each person's earliest night on record, by date.
 *
 * Used at write time so a new row lands with the right value even when its
 * night is older than ones already uploaded: it is a first appearance iff its
 * date is before this. It cannot reach back and unmark the later row that used
 * to be their first — the read path above corrects that, and the fix script
 * re-syncs the stored column.
 */
export function earliestDateByPlayer(
  participations: Participation[],
  gameNights: GameNight[],
): Map<string, string> {
  const dateById = new Map(gameNights.map((gn) => [gn.gameNightId, gn.gameNightDate]));
  const earliest = new Map<string, string>();
  for (const p of participations) {
    const date = dateById.get(p.gameNightId);
    if (!date) continue;
    const current = earliest.get(p.playerId);
    if (!current || date < current) earliest.set(p.playerId, date);
  }
  return earliest;
}
