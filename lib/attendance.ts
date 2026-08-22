// The door check-in list — a different animal from the registration export.
//
// Registration arrives as an 80-column Google Forms dump keyed by email.
// Attendance arrives as **two columns**: a timestamp and one string like
// `"Embile, Jack 🏐"`. No email, no separate name fields, no sport column —
// surname-first name plus an emoji, which is what someone tapped at the door.
//
// That shape drives every decision here:
//
// - **Matching runs on name, because there is no email.** The file happens to
//   arrive in exactly the form `lib/fuzzy.ts` normalises to, `"Last, First"`,
//   so an exact comparison does most of the work: 114 of 131 rows on
//   2026-05-30. The other 17 are typos (`Besmknte`), stray spacing
//   (`Gatpolintan , Hannah Marie`), suffixes (`Zosimo Jr`) and nicknames
//   (`Cuello, JL`) — the review queue's existing job.
// - **Duplicates are collapsed first.** 11 of those 131 rows were the same
//   person tapping twice.
// - **The timestamp is kept whole.** Arrivals spread from 5:33pm to 8:28pm,
//   and that curve is worth charting later. It is never timezone-converted:
//   the hour as written is the local hour.

import ExcelJS from "exceljs";
import { nameSimilarity, normalizeName } from "./fuzzy";
import { normalizeSport } from "./column-map";
import type { IncomingAttendanceRow, Player } from "./types";

const TIMESTAMP_HEADER = "Timestamp";
const ATTENDANCE_HEADER = "Attendance";

/** Emoji the check-in list uses, mapped to the sport names the app stores. */
const SPORT_BY_EMOJI: Record<string, string> = {
  "🏀": "Basketball",
  "🏸": "Badminton",
  "🏐": "Volleyball",
  "🥒": "Pickleball",
  "🏃": "Running",
};

/**
 * An Excel/Sheets serial date to `YYYY-MM-DDTHH:MM:SS`, by arithmetic only.
 *
 * The serial is days since 1899-12-30; the fraction is the time of day. Both
 * are converted without ever constructing a local `Date`, because the hour in
 * a check-in sheet is the hour written at the door. Parsing it as an instant
 * and re-rendering it in another zone turns a 17:30 arrival into 01:30 the
 * following morning — the same rule that governs the DGroup time fields.
 */
export function serialToLocalIso(serial: number): string {
  const days = Math.floor(serial);
  const seconds = Math.round((serial - days) * 86400);
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  // UTC accessors on a UTC-built epoch: arithmetic on a calendar, not a clock.
  const at = new Date(Date.UTC(1899, 11, 30) + days * 86_400_000);
  const y = at.getUTCFullYear();
  const mo = String(at.getUTCMonth() + 1).padStart(2, "0");
  const d = String(at.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}T${hh}:${mm}:${ss}`;
}

/**
 * Whatever a Timestamp cell holds, as `YYYY-MM-DDTHH:MM:SS`.
 *
 * Three shapes reach this. A serial number, from a Sheets tab read with
 * formatting off. An ISO string, from an uploaded `.xlsx` via ExcelJS. And a
 * locale-formatted string like `8/22/2026 17:30:54`, if the column was ever
 * typed as text rather than as a date — handled because it is cheap to, and
 * because the failure it causes is silent: every row filtered out and a night
 * that reads as nobody coming.
 */
export function normalizeCheckInTimestamp(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) return serialToLocalIso(raw);

  const text = String(raw ?? "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text;

  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (us) {
    const [, a, b, year, hourRaw, min, sec = "00", meridiem] = us;
    // Month-first unless the first number cannot be a month.
    const first = Number(a);
    const month = first > 12 ? Number(b) : first;
    const day = first > 12 ? first : Number(b);
    let hour = Number(hourRaw);
    if (meridiem) {
      const pm = meridiem.toUpperCase() === "PM";
      hour = pm ? (hour % 12) + 12 : hour % 12;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${min}:${sec}`;
  }

  return text;
}

export interface AttendanceParseResult {
  ok: boolean;
  missingColumns?: string[];
  rows: IncomingAttendanceRow[];
  /** Same person scanned twice — collapsed, but reported so it is not silent. */
  duplicateCount: number;
  /** Rows with no usable name at all. */
  unusableRowCount: number;
}

function cellText(cell: ExcelJS.Cell | undefined): string {
  const value = cell?.value;
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value).trim();
}

/** `"Embile, Jack 🏐"` → last "Embile", first "Jack", sport "Volleyball". */
export function parseCheckInName(raw: string): { lastName: string; firstName: string; sport?: string } {
  const emoji = raw.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu)?.[0];
  const text = normalizeSport(raw);
  const comma = text.indexOf(",");
  const lastName = (comma >= 0 ? text.slice(0, comma) : text).trim();
  const firstName = (comma >= 0 ? text.slice(comma + 1) : "").trim();
  return { lastName, firstName, sport: emoji ? SPORT_BY_EMOJI[emoji] : undefined };
}

/**
 * The tail both ingestion paths share: parse each name, drop the unusable,
 * collapse repeat taps.
 *
 * Extracted 2026-08-17 when the sheet-link path arrived. The two doors differ
 * only in where the cells come from — an `.xlsx` a browser uploaded, or a tab
 * the app reads directly — and the rules about what a check-in *means* must
 * not be written twice, or the two paths will drift the way the segmentation
 * rules did.
 */
export function collapseAttendanceRows(
  incoming: { rowIndex: number; raw: string; checkedInAt: string }[],
): AttendanceParseResult {
  const rows: IncomingAttendanceRow[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  let unusableRowCount = 0;

  for (const entry of incoming) {
    const raw = entry.raw.trim();
    if (!raw) continue;

    const { lastName, firstName, sport } = parseCheckInName(raw);
    if (!lastName && !firstName) {
      unusableRowCount += 1;
      continue;
    }

    // First tap wins: it is the arrival time, and a second tap is the same
    // arrival recorded twice rather than a second arrival.
    const key = normalizeName(firstName, lastName);
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);

    rows.push({ rowIndex: entry.rowIndex, raw, lastName, firstName, sport, checkedInAt: entry.checkedInAt });
  }

  return { ok: true, rows, duplicateCount, unusableRowCount };
}

export async function parseAttendanceFile(buffer: ArrayBuffer): Promise<AttendanceParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { ok: false, missingColumns: [ATTENDANCE_HEADER], rows: [], duplicateCount: 0, unusableRowCount: 0 };
  }

  const headerToCol = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const text = String(cell.value ?? "").trim();
    if (text) headerToCol.set(text, colNumber);
  });

  const nameCol = headerToCol.get(ATTENDANCE_HEADER);
  if (!nameCol) {
    return { ok: false, missingColumns: [ATTENDANCE_HEADER], rows: [], duplicateCount: 0, unusableRowCount: 0 };
  }
  const timeCol = headerToCol.get(TIMESTAMP_HEADER);

  const incoming: { rowIndex: number; raw: string; checkedInAt: string }[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    incoming.push({
      rowIndex: rowNumber,
      raw: cellText(row.getCell(nameCol)).trim(),
      checkedInAt: timeCol ? cellText(row.getCell(timeCol)) : "",
    });
  });

  return collapseAttendanceRows(incoming);
}

/**
 * The same two columns, read straight out of a Google Sheet tab instead of an
 * uploaded file.
 *
 * `values[0]` is the header row, exactly as the Sheets API returns it.
 */
export function parseAttendanceValues(values: (string | number | boolean | null)[][]): AttendanceParseResult {
  const headers = (values[0] ?? []).map((h) => String(h ?? "").trim());
  const nameCol = headers.indexOf(ATTENDANCE_HEADER);
  if (nameCol === -1) {
    return { ok: false, missingColumns: [ATTENDANCE_HEADER], rows: [], duplicateCount: 0, unusableRowCount: 0 };
  }
  const timeCol = headers.indexOf(TIMESTAMP_HEADER);

  return collapseAttendanceRows(
    values.slice(1).map((line, i) => ({
      rowIndex: i + 2, // +2: 1-indexed, plus the header row
      raw: String(line[nameCol] ?? "").trim(),
      checkedInAt: timeCol === -1 ? "" : normalizeCheckInTimestamp(line[timeCol]),
    })),
  );
}

/** Why a candidate is being suggested — shown, never left implicit. */
export interface AttendanceSignals {
  surnameSimilarity: number;
  registeredThisNight: boolean;
  sportMatches: boolean;
  nicknameMatches: boolean;
  nameSimilarity: number;
}

export interface AttendanceCandidate {
  player: Player;
  score: number;
  signals: AttendanceSignals;
  /** What the candidate registered to play, when they registered at all. */
  registeredSport?: string;
}

export type AttendanceMatch =
  | { kind: "matched"; row: IncomingAttendanceRow; player: Player }
  | { kind: "ambiguous"; row: IncomingAttendanceRow; candidates: AttendanceCandidate[] };

/** Roster facts for the night being checked in — the strongest evidence there is. */
export interface AttendanceContext {
  registeredPlayerIds: Set<string>;
  sportByPlayerId: Map<string, string>;
}

/**
 * Weights, calibrated against the 13 real review cases from 2026-05-30 rather
 * than guessed. The ordering is the finding: **string distance is the weakest
 * signal here.** "Amaba, Junius Timotei" is Amaba, Theo at 0.43 similarity —
 * ranking on names alone buries the right answer under strangers on 8 of 13.
 * Registering for this exact night, and having registered the sport the door
 * list recorded, are what actually predict the person.
 */
const WEIGHT = {
  surname: 5,
  registeredThisNight: 3,
  sportMatches: 2,
  nickname: 4,
  fullName: 2,
};

/** How many suggestions a review card offers before it becomes a list to read. */
const MAX_CANDIDATES = 4;

const surnameOf = (key: string) => key.split(",")[0]?.trim() ?? key;

function scoreCandidate(
  row: IncomingAttendanceRow,
  player: Player,
  context: AttendanceContext,
): AttendanceCandidate {
  const rowKey = normalizeName(row.firstName, row.lastName);
  const playerKey = normalizeName(player.firstName, player.lastName);

  const registeredSport = context.sportByPlayerId.get(player.playerId);
  const signals: AttendanceSignals = {
    surnameSimilarity: nameSimilarity(surnameOf(rowKey), surnameOf(playerKey)),
    registeredThisNight: context.registeredPlayerIds.has(player.playerId),
    sportMatches: !!row.sport && !!registeredSport && row.sport === registeredSport,
    nicknameMatches:
      !!player.nickname &&
      !!row.firstName &&
      player.nickname.trim().toLowerCase() === row.firstName.trim().toLowerCase(),
    nameSimilarity: nameSimilarity(rowKey, playerKey),
  };

  const score =
    signals.surnameSimilarity * WEIGHT.surname +
    (signals.registeredThisNight ? WEIGHT.registeredThisNight : 0) +
    (signals.sportMatches ? WEIGHT.sportMatches : 0) +
    (signals.nicknameMatches ? WEIGHT.nickname : 0) +
    signals.nameSimilarity * WEIGHT.fullName;

  return { player, score, signals, registeredSport };
}

/**
 * Exact normalised-name match only. Anything else goes to review rather than
 * being guessed: without an email there is no second signal to catch a wrong
 * link, and a wrong link marks the wrong person present.
 */
export function matchAttendance(
  rows: IncomingAttendanceRow[],
  players: Player[],
  context: AttendanceContext,
): AttendanceMatch[] {
  const byName = new Map<string, Player[]>();
  for (const player of players) {
    const key = normalizeName(player.firstName, player.lastName);
    const list = byName.get(key) ?? [];
    list.push(player);
    byName.set(key, list);
  }

  return rows.map((row) => {
    const hits = byName.get(normalizeName(row.firstName, row.lastName)) ?? [];
    if (hits.length === 1) return { kind: "matched" as const, row, player: hits[0] };

    // Zero hits used to mean an empty candidate list — a review card with a
    // name and nothing to compare it to. Every candidate is now scored, so
    // the queue always has something to offer or an honest "nobody plausible".
    const candidates = players
      .map((player) => scoreCandidate(row, player, context))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES);

    return { kind: "ambiguous" as const, row, candidates };
  });
}
