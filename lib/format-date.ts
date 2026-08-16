const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Formats a `YYYY-MM-DD` game-night date by reading the string, never by
 * constructing a `Date`.
 *
 * `new Date("2026-08-01T00:00:00")` is parsed in the *runtime's* zone, so a
 * server in UTC and a browser in UTC+8 disagree about which day it is — which
 * rendered as a React hydration mismatch on the dashboard, and would silently
 * shift a night's label by one day for anyone west of the server.
 *
 * These are calendar dates with no time and no zone. Treating them as
 * instants was the mistake; the same rule already governs `attendedAt` and
 * the DGroup time fields.
 */
export function formatDate(iso: string): string {
  const [, month, day] = iso.split("-");
  const name = MONTHS[Number(month) - 1];
  if (!name || !day) return iso;
  return `${name} ${Number(day)}`;
}

/** Same, with the year — for contexts spanning more than one season. */
export function formatDateWithYear(iso: string): string {
  const [year] = iso.split("-");
  return year ? `${formatDate(iso)}, ${year}` : iso;
}

/** `Sat, Aug 1` — the game-night ledger's format. */
export function formatDateWithWeekday(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  // Zeller's congruence — arithmetic on the calendar date, no Date object.
  const m = month < 3 ? month + 12 : month;
  const y = month < 3 ? year - 1 : year;
  const h = (day + Math.floor((13 * (m + 1)) / 5) + y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7;
  const weekday = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"][h];
  return `${weekday}, ${formatDate(iso)}`;
}
