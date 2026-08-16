/**
 * The whole-population facet every sport grid opens with.
 *
 * Lives in its own module rather than in `lib/dashboard-metrics` because the
 * panels that render these grids are client components, and a value import
 * from `dashboard-metrics` reaches `lib/store` and pulls `googleapis` into the
 * browser bundle. Types can cross that line; a string constant cannot.
 *
 * Drawn first, then the sports alphabetically, so the attendance grid and the
 * discipleship-mix grid can be read against each other position by position —
 * and so a reader sees the season's own shape before comparing five sports to
 * it. Rankings inside those grids are marked with a chip, never with position.
 */
export const TOTAL_FACET = "Total";
