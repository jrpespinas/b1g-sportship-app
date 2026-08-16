// Placing seekers with leaders who said they can absorb someone.
//
// The whole design of this module follows from one measurement: requiring all
// six stated preferences to agree matches **nobody** (0 of 40 seekers). Read
// as a score across interpreted criteria instead, every seeker has a viable
// candidate — 9 at five of five, 25 at four, 6 at three. So this scores and
// ranks; it never filters a person out of view.
//
// Two of the criteria need interpreting rather than comparing:
//
// - **Age** is free text, not a controlled list: seekers write "25-30", "23",
//   "22-28"; leaders write "25-35", "22-30". Compared as strings it matches 1
//   of 40. Read as overlapping numeric ranges it matches 22 of 40.
// - **Time** is an Excel serial datetime. The hour as written is the intended
//   local hour, so it is read directly and never timezone-converted.
//
// Because both are interpretations of what someone typed, every criterion
// carries the raw values it compared, so a wrong read is visible rather than
// buried inside a number.

import { isWillingToAbsorb, getPlayerSegment } from "./dgroup";
import { formatName } from "./player-name";
import type { Player } from "./types";

/**
 * Source column headers, verbatim from the Google Form export — including its
 * typos ("your are leading", "your plan to join"). These live in `raw_json`
 * rather than as Players columns, so they are read by exact header text.
 */
export const DGROUP_PREFERENCE_COLUMNS = {
  seekerLocation: "Location of Discipleship Group you plan to join",
  leaderLocation: "Location of Discipleship Group your are leading",
  seekerFormat: "Type of Discipleship Group you plan to join",
  leaderFormat: "Type of Discipleship Group you are leading",
  seekerDays: "Which days are you planning to join your discipleship group?",
  leaderDays: "Which days are you leading your discipleship group?",
  seekerAge: "Age range of Discipleship Group you plan to join",
  leaderAge: "Age range of Discipleship Group you are leading",
  seekerTime: "Time of Discipleship Group you plan to join",
  leaderTime: "Time of Discipleship Group you are leading",
  seekerLanguage: "Language of Discipleship Group your plan to join",
  leaderLanguage: "Language of Discipleship Group your are leading",
} as const;

/** Exported for `lib/supply-demand.ts`, which reads the same answers in bulk. */
const COL = DGROUP_PREFERENCE_COLUMNS;

const read = (player: Player, key: string): string => (player.raw?.[key] ?? "").trim();

export type CriterionKey = "location" | "format" | "age" | "time";

/** `unknown` means one side left it blank — never counted as a miss. */
export type CriterionOutcome = "met" | "missed" | "unknown";

export interface CriterionResult {
  key: CriterionKey;
  label: string;
  outcome: CriterionOutcome;
  seekerValue: string;
  leaderValue: string;
  /** What the comparison actually concluded, when the values alone don't say. */
  note?: string;
}

export interface Candidate {
  leader: Player;
  criteria: CriterionResult[];
  met: number;
  /** Criteria that could actually be judged — the denominator we display. */
  evaluated: number;
  /** Days both are free. Always non-empty: it is a gate, not a score. */
  days: string[];
}

export interface SeekerMatch {
  seeker: Player;
  wants: { location: string; format: string; days: string; age: string; time: string };
  candidates: Candidate[];
  /** Best `met` on offer, or 0 when nobody matches anything. */
  bestScore: number;
  /** Same-gender leaders this seeker was compared against — see `sharesGender`. */
  poolSize: number;
  /** Why a seeker has no candidates, when one of the gates closed the pool. */
  blockedReason?: "seeker-gender-unknown" | "no-same-gender-leader" | "no-day-overlap" | "no-day-stated";
}

// "25-30" -> [25,30] · "23" -> [23,23] · "22 to 28" -> [22,28]
export function parseAgeRange(value: string): [number, number] | null {
  const found = value.match(/\d{1,2}/g);
  if (!found) return null;
  const ages = found.map(Number).filter((n) => n >= 10 && n <= 99);
  if (ages.length === 0) return null;
  return [Math.min(...ages), Math.max(...ages)];
}

/** Excel serialises the answer as a 1899-12-30 datetime; the hour is literal. */
export function parseHour(value: string): number | null {
  const iso = value.match(/T(\d{2}):/);
  if (iso) return Number(iso[1]);
  const clock = value.match(/^(\d{1,2}):(\d{2})/);
  return clock ? Number(clock[1]) : null;
}

export function formatHour(hour: number | null): string {
  if (hour == null) return "—";
  const suffix = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${suffix}`;
}

/**
 * Splits on comma AND slash. The form's multi-value answers use both — days
 * arrive as "Saturday, Sunday" but languages as "Filipino/English". Treating
 * the latter as one opaque token made a Filipino-speaking seeker read as
 * incompatible with a Filipino/English group, which is exactly backwards.
 */
const asSet = (value: string) =>
  new Set(value.split(/[,/]/).map((s) => s.trim()).filter(Boolean));

/** Time counts as agreeing within an hour either way. */
const TIME_TOLERANCE_HOURS = 1;

function locationCriterion(seekerValue: string, leaderValue: string): CriterionResult {
  const base = { key: "location" as const, label: "Location", seekerValue, leaderValue };
  if (!seekerValue || !leaderValue) return { ...base, outcome: "unknown" };

  // "Others" is a real option on the form and 7 seekers plus 15 leaders chose
  // it. Two people who both declined to name a place are not demonstrably in
  // the same place, so this can never count as agreement.
  if (seekerValue === "Others" && leaderValue === "Others") {
    return { ...base, outcome: "missed", note: "both answered Others — not necessarily the same place" };
  }
  return { ...base, outcome: seekerValue === leaderValue ? "met" : "missed" };
}

/**
 * Days a seeker and leader both have. A **gate, not a criterion**: a group
 * that meets when you cannot come is not a worse match, it is not a match.
 * Scoring it would let four other agreements outvote the one thing that makes
 * attendance possible at all.
 *
 * Measured before applying: no seeker is stranded by requiring it. Every one
 * of the 40 has at least one same-gender leader meeting on a day they want
 * (median 26 candidates, smallest pool 1).
 */
export function sharedDays(seeker: Player, leader: Player): string[] {
  const wanted = asSet(read(seeker, COL.seekerDays));
  const offered = asSet(read(leader, COL.leaderDays));
  return [...wanted].filter((day) => offered.has(day));
}

function ageCriterion(seekerValue: string, leaderValue: string): CriterionResult {
  const base = { key: "age" as const, label: "Age", seekerValue, leaderValue };
  const s = parseAgeRange(seekerValue);
  const l = parseAgeRange(leaderValue);
  if (!s || !l) return { ...base, outcome: "unknown", note: "age not stated as a number" };
  return s[0] <= l[1] && l[0] <= s[1]
    ? { ...base, outcome: "met", note: `${s[0]}–${s[1]} overlaps ${l[0]}–${l[1]}` }
    : { ...base, outcome: "missed", note: `${s[0]}–${s[1]} against ${l[0]}–${l[1]}` };
}

function timeCriterion(seekerValue: string, leaderValue: string): CriterionResult {
  const base = { key: "time" as const, label: "Time", seekerValue, leaderValue };
  const s = parseHour(seekerValue);
  const l = parseHour(leaderValue);
  if (s == null || l == null) return { ...base, outcome: "unknown" };
  const gap = Math.abs(s - l);
  if (gap <= TIME_TOLERANCE_HOURS) {
    return { ...base, outcome: "met", note: gap === 0 ? "same hour" : "within an hour" };
  }
  return { ...base, outcome: "missed", note: `${formatHour(s)} against ${formatHour(l)}` };
}

function compare(seeker: Player, leader: Player): Candidate {
  const seekerFormat = read(seeker, COL.seekerFormat);
  const leaderFormat = read(leader, COL.leaderFormat);

  const criteria: CriterionResult[] = [
    locationCriterion(read(seeker, COL.seekerLocation), read(leader, COL.leaderLocation)),
    {
      key: "format",
      label: "Format",
      seekerValue: seekerFormat,
      leaderValue: leaderFormat,
      outcome: !seekerFormat || !leaderFormat ? "unknown" : seekerFormat === leaderFormat ? "met" : "missed",
    },
    ageCriterion(read(seeker, COL.seekerAge), read(leader, COL.leaderAge)),
    timeCriterion(read(seeker, COL.seekerTime), read(leader, COL.leaderTime)),
  ];

  return {
    leader,
    criteria,
    met: criteria.filter((c) => c.outcome === "met").length,
    evaluated: criteria.filter((c) => c.outcome !== "unknown").length,
    days: sharedDays(seeker, leader),
  };
}

/**
 * Language is deliberately not a criterion: 34 of 40 seekers and 130 of 148
 * leaders both answer "Filipino/English", so it separates almost nobody.
 * It is surfaced only when the two sides genuinely differ.
 */
export function languageNote(seeker: Player, leader: Player): string | undefined {
  const s = read(seeker, COL.seekerLanguage);
  const l = read(leader, COL.leaderLanguage);
  if (!s || !l) return undefined;
  const shared = [...asSet(s)].some((x) => asSet(l).has(x));
  return shared ? undefined : `Language differs: ${s} against ${l}`;
}

/**
 * Men are placed with men and women with women. This is a **gate, not a
 * criterion**: it never enters the score, because a boundary the ministry
 * does not cross cannot be outweighed by a convenient meeting time. Scoring
 * it would imply four other agreements could carry a fifth disagreement here.
 *
 * A blank on either side is never guessed. Today that is nobody — all 40
 * seekers and all 148 leaders state a gender — but 72 players elsewhere in
 * the roster leave it blank, so the case will arrive. When it does, the
 * seeker gets no suggestions and the panel says why, which is a prompt to go
 * and ask rather than a silent dead end.
 *
 * Cross-gender candidates are never rendered at all, not even as rejected:
 * showing someone a five-of-five they may not act on only invites the
 * question.
 */
export function sharesGender(seeker: Player, leader: Player): boolean {
  const s = (seeker.gender ?? "").trim().toLowerCase();
  const l = (leader.gender ?? "").trim().toLowerCase();
  return s !== "" && l !== "" && s === l;
}

export function isSeeker(player: Player): boolean {
  return getPlayerSegment(player) === "Seekers";
}

export function isLeaderWithCapacity(player: Player): boolean {
  return getPlayerSegment(player) === "Leaders" && isWillingToAbsorb(player.dgroupLeadingWillingToAbsorb);
}

/**
 * Ranked candidates for every seeker, hardest to place first — the low scores
 * are the ones needing a human decision, while a five-of-five is quick.
 */
export function buildMatchBoard(players: Player[]): SeekerMatch[] {
  const seekers = players.filter(isSeeker);
  const leaders = players.filter(isLeaderWithCapacity);

  const board = seekers.map((seeker) => {
    // Both gates run before any scoring, so an impossible pairing is never
    // built, never ranked, and never reaches the client.
    const sameGender = leaders.filter((leader) => sharesGender(seeker, leader));
    const eligible = sameGender.filter((leader) => sharedDays(seeker, leader).length > 0);
    const candidates = eligible
      .map((leader) => compare(seeker, leader))
      .sort((a, b) => b.met - a.met || b.evaluated - a.evaluated);

    const genderKnown = (seeker.gender ?? "").trim() !== "";
    const daysStated = asSet(read(seeker, COL.seekerDays)).size > 0;
    const blockedReason = !genderKnown
      ? ("seeker-gender-unknown" as const)
      : !daysStated
        ? ("no-day-stated" as const)
        : sameGender.length === 0
          ? ("no-same-gender-leader" as const)
          : eligible.length === 0
            ? ("no-day-overlap" as const)
            : undefined;

    return {
      seeker,
      wants: {
        location: read(seeker, COL.seekerLocation),
        format: read(seeker, COL.seekerFormat),
        days: read(seeker, COL.seekerDays),
        age: read(seeker, COL.seekerAge),
        time: read(seeker, COL.seekerTime),
      },
      candidates,
      bestScore: candidates.length > 0 ? candidates[0].met : 0,
      poolSize: eligible.length,
      blockedReason,
    };
  });

  return board.sort((a, b) => a.bestScore - b.bestScore);
}

/**
 * The board trimmed to what the client actually renders. A full board is 40
 * seekers × 148 leaders, and every `Player` carries its whole `raw` payload —
 * shipping that to the browser would be megabytes to draw a few dozen rows.
 */
export interface MatchPerson {
  playerId: string;
  name: string;
  email: string;
  mobile: string;
}

export interface SlimCandidate {
  leader: MatchPerson;
  criteria: CriterionResult[];
  met: number;
  evaluated: number;
  days: string[];
  languageNote?: string;
}

export interface SlimSeekerMatch {
  seeker: MatchPerson;
  wantsLine: string;
  candidates: SlimCandidate[];
  bestScore: number;
  /** How many leaders were compared, so the UI can say what it is hiding. */
  totalCandidates: number;
  /** Lower-case "male"/"female" as stated, for the compared-pool line. */
  gender: string;
  /** Days this seeker said they are free — the day filter reads these. */
  wantedDays: string[];
  poolSize: number;
  blockedReason?: SeekerMatch["blockedReason"];
}

const person = (player: Player): MatchPerson => ({
  playerId: player.playerId,
  name: formatName(player),
  email: player.email ?? "",
  mobile: player.mobileNumber ?? "",
});

/** Placeholders people type when they mean "no preference". */
const NON_ANSWERS = new Set(["—", "-", "n/a", "na", "none", "any", "wala"]);

export function describeWants(wants: SeekerMatch["wants"]): string {
  return [wants.location, wants.format, wants.days, wants.age, formatHour(parseHour(wants.time))]
    .map((v) => (v ?? "").trim())
    .filter((v) => v && !NON_ANSWERS.has(v.toLowerCase()))
    .join(" · ");
}

export function toSlimBoard(board: SeekerMatch[], keep: number): SlimSeekerMatch[] {
  return board.map((match) => ({
    seeker: person(match.seeker),
    wantsLine: describeWants(match.wants),
    bestScore: match.bestScore,
    totalCandidates: match.candidates.length,
    gender: (match.seeker.gender ?? "").trim().toLowerCase(),
    wantedDays: [...asSet(match.wants.days)],
    poolSize: match.poolSize,
    blockedReason: match.blockedReason,
    candidates: match.candidates.slice(0, keep).map((candidate) => ({
      leader: person(candidate.leader),
      criteria: candidate.criteria,
      met: candidate.met,
      evaluated: candidate.evaluated,
      days: candidate.days,
      languageNote: languageNote(match.seeker, candidate.leader),
    })),
  }));
}

export interface MatchTotals {
  seekers: number;
  leaders: number;
  strong: number;
  workable: number;
  hard: number;
  /** Seekers a gate left with nobody — a planting signal, not a match. */
  blocked: number;
}

/**
 * Buckets are measured against each seeker's own denominator rather than a
 * fixed number, because a criterion nobody could judge is out of the score.
 * Comparing "3" to a hardcoded 4 would demote someone whose age was simply
 * never written down.
 */
export function matchTotals(board: SeekerMatch[], leaderCount: number): MatchTotals {
  let strong = 0;
  let workable = 0;
  let hard = 0;
  let blocked = 0;

  for (const match of board) {
    const top = match.candidates[0];
    if (!top) {
      blocked += 1;
      continue;
    }
    const shortfall = top.evaluated - top.met;
    if (shortfall === 0) strong += 1;
    else if (shortfall === 1) workable += 1;
    else hard += 1;
  }

  return { seekers: board.length, leaders: leaderCount, strong, workable, hard, blocked };
}
