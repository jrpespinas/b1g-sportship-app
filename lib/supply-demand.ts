// What leaders offer against what seekers want, on the four dimensions the
// form asks both sides about (docs/spec/03-dashboard.md, metric 28).
//
// Three populations answer these questions, and they are not interchangeable:
//
//   184  describe a group they are **already leading**  — the offer
//   126  describe one they **plan to lead**             — future supply
//    86  describe one they **plan to join**             — the want
//
// The offer side is the 184 only. `buildMatchBoard` scores against exactly
// that set, so widening it here would put a number on the dashboard that the
// match board cannot act on. The 126 are reported as a separate figure.
//
// Both wings are drawn as a share of their own population, on one shared
// percentage axis. The populations differ better than two to one, so a shared
// *count* axis would render every seeker bar at roughly half its leader
// counterpart and make proportional agreement look like a shortfall.

import { DGROUP_PREFERENCE_COLUMNS as COL, formatHour, parseHour } from "./matching";
import type { Player } from "./types";

const PLANNED_LEADER_COLUMNS = {
  day: "Which days are you planning to lead your discipleship group?",
  time: "Time of Discipleship Group you plan to lead",
  setup: "Type of Discipleship Group you plan to lead",
  location: "Location of Discipleship Group you plan to lead",
} as const;

export type SupplyDemandKey = "day" | "time" | "setup" | "location";

export interface SupplyDemandRow {
  label: string;
  offer: number;
  want: number;
  /** Of that side's own answers — what the bars are drawn from. */
  offerShare: number;
  wantShare: number;
}

export interface SupplyDemandDimension {
  key: SupplyDemandKey;
  title: string;
  rows: SupplyDemandRow[];
  /** The most-chosen value on each side. */
  offerTop?: string;
  wantTop?: string;
  /**
   * Whether the two sides want the same thing most. Deliberately a rank test
   * rather than a distance: time is spread over sixteen hourly rows and setup
   * over three, so any distance measure would report the dimension with the
   * most categories as the most divergent regardless of the answers.
   */
  agrees: boolean;
}

export interface SupplyDemand {
  dimensions: SupplyDemandDimension[];
  /** Leaders describing a group they run — the offer side's denominator. */
  offerRespondents: number;
  /** Seekers describing one they want. */
  wantRespondents: number;
  /** Leaders describing one they plan to lead: supply that has not started. */
  plannedLeaders: number;
}

/**
 * The clock window the rows cover. 172 of 184 leader answers and 84 of 86
 * seeker answers fall inside it; everything else is folded into one visible
 * row rather than dropped, so the totals still add up.
 */
const FIRST_HOUR = 6;
const LAST_HOUR = 21;
const OTHER_HOURS = "Other hours";

/**
 * Every hour in the window, in clock order. Seeded as rows even when nobody
 * chose them: an empty 4pm between a busy 3pm and 5pm is a fact about the
 * hour, and an axis that closed the gap would not be an axis.
 */
const HOUR_LABELS = [
  ...Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => formatHour(FIRST_HOUR + i)),
  OTHER_HOURS,
];

/** Sunday first, matching how the ministry's own week is written. */
const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The form's own catch-all option, not a rest bucket — pinned last regardless. */
const OTHERS_OPTION = "Others";

const read = (player: Player, key: string): string => (player.raw?.[key] ?? "").trim();

/** Days arrive as "Saturday, Sunday", languages as "Filipino/English". */
const splitMulti = (value: string) =>
  value.split(/[,/]/).map((s) => s.trim()).filter(Boolean);

function hourLabel(value: string): string {
  const hour = parseHour(value);
  if (hour == null || hour < FIRST_HOUR || hour > LAST_HOUR) return OTHER_HOURS;
  return formatHour(hour);
}

interface Tally {
  counts: Map<string, number>;
  /** People who answered — not answers given, which multi-select inflates. */
  respondents: number;
}

function tally(players: Player[], column: string, kind: "multi" | "hour" | "one"): Tally {
  const counts = new Map<string, number>();
  let respondents = 0;

  for (const player of players) {
    const value = read(player, column);
    if (!value) continue;
    respondents += 1;
    const labels =
      kind === "multi" ? splitMulti(value) : kind === "hour" ? [hourLabel(value)] : [value];
    for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return { counts, respondents };
}

function buildDimension(
  key: SupplyDemandKey,
  title: string,
  offer: Tally,
  want: Tally,
  order: (labels: string[], rows: Map<string, SupplyDemandRow>) => string[],
  seed: string[] = [],
): SupplyDemandDimension {
  // Over people, not over answers. Days are multi-select, so dividing by the
  // number of answers would make "43% of leaders meet on Sunday" read as
  // "Sunday is 31% of all the days leaders named" — a different claim, and
  // not one anyone can act on. Multi-select shares therefore exceed 100%
  // down a column, which is correct.
  const offerTotal = Math.max(1, offer.respondents);
  const wantTotal = Math.max(1, want.respondents);

  const rows = new Map<string, SupplyDemandRow>();
  for (const label of new Set([...seed, ...offer.counts.keys(), ...want.counts.keys()])) {
    const o = offer.counts.get(label) ?? 0;
    const w = want.counts.get(label) ?? 0;
    rows.set(label, { label, offer: o, want: w, offerShare: o / offerTotal, wantShare: w / wantTotal });
  }

  const top = (counts: Map<string, number>) =>
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const offerTop = top(offer.counts);
  const wantTop = top(want.counts);

  return {
    key,
    title,
    rows: order([...rows.keys()], rows).map((label) => rows.get(label)!),
    offerTop,
    wantTop,
    agrees: !!offerTop && offerTop === wantTop,
  };
}

/** Biggest combined first, with the form's "Others" option always last. */
const byCombined = (labels: string[], rows: Map<string, SupplyDemandRow>) =>
  labels.sort((a, b) => {
    if (a === OTHERS_OPTION) return 1;
    if (b === OTHERS_OPTION) return -1;
    const ra = rows.get(a)!;
    const rb = rows.get(b)!;
    return rb.offerShare + rb.wantShare - (ra.offerShare + ra.wantShare);
  });

export function getSupplyDemand(players: Player[]): SupplyDemand {
  const dimensions: SupplyDemandDimension[] = [
    // Time first: it is the only dimension where the two sides' first choice
    // differs, and the three that agree read as its control group.
    buildDimension(
      "time",
      "Time of day",
      tally(players, COL.leaderTime, "hour"),
      tally(players, COL.seekerTime, "hour"),
      // Clock order, and never by size: an hour axis out of sequence stops
      // being an axis. The out-of-window row sits at the end.
      (labels) => labels.sort((a, b) => HOUR_LABELS.indexOf(a) - HOUR_LABELS.indexOf(b)),
      // The window is seeded; the out-of-window row is not, so it appears
      // only when somebody actually answered outside it.
      HOUR_LABELS.slice(0, -1),
    ),
    buildDimension(
      "day",
      "Day of the week",
      tally(players, COL.leaderDays, "multi"),
      tally(players, COL.seekerDays, "multi"),
      (labels) => labels.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)),
    ),
    buildDimension(
      "setup",
      "How it meets",
      tally(players, COL.leaderFormat, "one"),
      tally(players, COL.seekerFormat, "one"),
      byCombined,
    ),
    buildDimension(
      "location",
      "Where it meets",
      tally(players, COL.leaderLocation, "one"),
      tally(players, COL.seekerLocation, "one"),
      byCombined,
    ),
  ];

  return {
    dimensions,
    offerRespondents: tally(players, COL.leaderDays, "multi").respondents,
    wantRespondents: tally(players, COL.seekerDays, "multi").respondents,
    plannedLeaders: tally(players, PLANNED_LEADER_COLUMNS.day, "multi").respondents,
  };
}
