import type { Player } from "./types";

/**
 * Age bands, fixed rather than derived from the data's own quantiles so the
 * chart means the same thing next season.
 *
 * Chosen against the measured distribution: the ministry is tight around 28
 * (p10 23, p90 36), so the middle is split at five-year steps where almost
 * everyone is, and the tails are wide because they are nearly empty.
 */
export const AGE_BANDS = [
  { label: "18–24", min: 18, max: 24 },
  { label: "25–29", min: 25, max: 29 },
  { label: "30–34", min: 30, max: 34 },
  { label: "35–39", min: 35, max: 39 },
  { label: "40+", min: 40, max: 120 },
] as const;

export type AgeBand = (typeof AGE_BANDS)[number]["label"];

/**
 * Age from the registration form's Birth Year, which lives only in `raw` —
 * it was never promoted to a typed column. Present on 1,008 of 1,080 players.
 *
 * Year only. Birth Month is captured too, but a month cannot make an age band
 * more accurate than the ±1 year the bands already tolerate, and pairing them
 * would invite treating this as a birthday rather than a rough cohort.
 */
export function ageOf(player: Player, asOfYear: number): number | undefined {
  const year = Number.parseInt(String(player.raw["Birth Year"] ?? "").trim(), 10);
  if (!Number.isFinite(year) || year < 1900 || year > asOfYear) return undefined;
  const age = asOfYear - year;
  return age >= 10 && age <= 120 ? age : undefined;
}

export function ageBandOf(age: number): AgeBand | undefined {
  return AGE_BANDS.find((b) => age >= b.min && age <= b.max)?.label;
}

/** "Male" / "Female" / "Unspecified" — the three the roster actually holds. */
export function genderOf(player: Player): "Male" | "Female" | "Unspecified" {
  const value = (player.gender ?? "").trim().toLowerCase();
  if (value.startsWith("m")) return "Male";
  if (value.startsWith("f")) return "Female";
  return "Unspecified";
}
