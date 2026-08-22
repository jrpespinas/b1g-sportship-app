import "server-only";
import { readExternalSheet } from "./sheets";
import { parseAttendanceValues, type AttendanceParseResult } from "./attendance";

/**
 * A game night can point at the Google Sheet its door check-ins land in,
 * instead of an admin exporting that sheet and uploading the file.
 *
 * Same two columns, same matching, same review queue — only the door changes.
 * Attendance still lands in one place; this is a second way in, not a second
 * store, which is the distinction that keeps two ingestion paths from drifting
 * into two versions of the truth.
 */

export interface SheetLink {
  spreadsheetId: string;
  /** The tab's numeric id from the URL. Absent means "the first tab". */
  gid?: string;
}

/**
 * Pulls the spreadsheet id and tab id out of any of the URL shapes Google
 * hands out — the address bar, Share, and "Publish to web" all differ.
 *
 * Returns null rather than guessing: a link the admin mistyped should fail at
 * paste time with something to fix, not at read time with a 404.
 */
export function parseSheetUrl(input: string): SheetLink | null {
  const url = input.trim();
  if (!url) return null;

  const id = url.match(/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]{20,})/)?.[1];
  if (!id) return null;

  // `#gid=0` in the fragment, or `?gid=0` on a published link.
  const gid = url.match(/[#&?]gid=([0-9]+)/)?.[1];
  return gid ? { spreadsheetId: id, gid } : { spreadsheetId: id };
}

export type AttendanceLinkResult =
  | {
      ok: true;
      parsed: AttendanceParseResult;
      tabTitle: string;
      /** Rows read before the date filter, so the UI can explain the narrowing. */
      totalRows: number;
      /** Rows kept for this night. */
      matchedDate: number;
      /** True when the sheet carries no Timestamp column to filter on. */
      unfiltered: boolean;
    }
  | { ok: false; reason: "bad-url" | "not-shared" | "not-found" | "no-such-tab" | "wrong-shape" | "unknown"; detail?: string };

/**
 * Reads a night's check-ins out of a linked sheet.
 *
 * **Filtered by date even though the link is per-night.** A Google Form writes
 * every response into one accumulating tab, so a link pasted for two different
 * nights would otherwise import the whole season into both. Per-night links
 * are the interface; the date filter is the safety net, and it costs nothing
 * when the sheet genuinely holds one night.
 *
 * The timestamp is compared as **written**, never parsed into a Date. A
 * 5:33pm check-in read as UTC becomes 1:33am the next day — the same rule the
 * DGroup time fields follow, and the reason arrival times are kept whole.
 */
export async function readAttendanceLink(
  url: string,
  gameNightDate: string,
): Promise<AttendanceLinkResult> {
  const link = parseSheetUrl(url);
  if (!link) return { ok: false, reason: "bad-url" };

  const sheet = await readExternalSheet(link.spreadsheetId, link.gid);
  if (!sheet.ok) return { ok: false, reason: sheet.reason, detail: sheet.detail };

  const parsed = parseAttendanceValues(sheet.values);
  if (!parsed.ok) return { ok: false, reason: "wrong-shape" };

  const dated = parsed.rows.filter((row) => row.checkedInAt.slice(0, 10) === gameNightDate);
  // No Timestamp column means nothing to filter on. Take the tab as given —
  // that is a sheet built for one night, which is exactly the other shape
  // this feature has to support.
  const unfiltered = parsed.rows.length > 0 && parsed.rows.every((row) => !row.checkedInAt);

  return {
    ok: true,
    tabTitle: sheet.title,
    totalRows: parsed.rows.length,
    matchedDate: unfiltered ? parsed.rows.length : dated.length,
    unfiltered,
    parsed: { ...parsed, rows: unfiltered ? parsed.rows : dated },
  };
}
