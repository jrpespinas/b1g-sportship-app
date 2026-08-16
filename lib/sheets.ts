// Thin wrapper around the Google Sheets API. This is the only file that
// knows about rows/ranges/columns — lib/store.ts consumes it as a plain
// object-array interface, so nothing above this layer knows Sheets exists.
// Server-only: the service-account key must never reach the client.

import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import { google, sheets_v4 } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

let client: sheets_v4.Sheets | null = null;

function getClient(): sheets_v4.Sheets {
  if (client) return client;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key || !SHEET_ID) {
    throw new Error(
      "Missing Google Sheets credentials — GOOGLE_SERVICE_ACCOUNT_EMAIL, " +
        "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_SHEET_ID must be set in .env.local.",
    );
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  client = google.sheets({ version: "v4", auth });
  return client;
}

/**
 * The cache tag every tab read is stored under. One tag, not one per tab: a
 * write to any tab can change what another one means (a new player and the
 * participation that created it land together), so they expire together.
 */
export const SHEETS_TAG = "sheets";

/**
 * How long a read may be reused. Measured 2026-08-16: three parallel tab
 * reads cost 904–1450ms, which was essentially the whole server render — the
 * aggregation over 1,080 players and 2,885 participations does not register
 * beside it.
 *
 * Five minutes is chosen against the read quota rather than against
 * staleness. Uploads land weekly, so any TTL under an hour is invisible to
 * correctness; what the app actually needed was for a burst of page views —
 * a volunteer head opening four surfaces after a game night — to cost one
 * round-trip instead of twelve. The per-minute read quota is reachable
 * otherwise, and a quota error renders as a raw runtime error page.
 *
 * Writes do not wait for it to expire: `revalidateSheets()` clears the tag,
 * so an admin sees their own upload immediately.
 */
const READ_TTL_SECONDS = 300;

/** Reads every data row (below the frozen header) as header-keyed objects. */
async function fetchTab(tabName: string): Promise<{ row: Record<string, string>; sheetRow: number }[]> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A1:ZZ`,
  });
  const values = res.data.values ?? [];
  if (values.length === 0) return [];

  const headers = values[0];
  return values.slice(1).map((line, i) => {
    const row: Record<string, string> = {};
    headers.forEach((header, colIndex) => {
      row[header] = line[colIndex] ?? "";
    });
    return { row, sheetRow: i + 2 }; // +2: 1-indexed, plus the header row itself
  });
}

/**
 * The read every caller uses. Cached per tab so that opening the dashboard,
 * the directory and the match board in one sitting costs one round-trip per
 * tab rather than one per page.
 *
 * Cached at this level deliberately: `listPlayers` and `listPlayersWithRows`
 * are two shapes of the same fetch, and caching the shapes separately would
 * pay for the same rows twice.
 */
export const readTab = unstable_cache(fetchTab, ["sheets-tab"], {
  tags: [SHEETS_TAG],
  revalidate: READ_TTL_SECONDS,
});

/**
 * Drops every cached tab read. Call after any write, from the server action
 * that made it — without this an admin would upload a roster and then watch
 * the dashboard report the old numbers for five minutes, which is exactly the
 * kind of quiet wrongness this app refuses everywhere else.
 *
 * `updateTag`, not `revalidateTag`. The latter now defaults to
 * stale-while-revalidate, which serves the pre-upload numbers once more while
 * it refetches — the one moment in this app where showing stale data is least
 * acceptable, because the admin is looking for the rows they just added.
 * `updateTag` expires immediately and makes the next read blocking, which is
 * the read-your-own-writes behaviour an upload needs. It is Server
 * Action-only, and both callers are server actions.
 */
export function revalidateSheets(): void {
  updateTag(SHEETS_TAG);
}

/** Appends rows in a single API call — always batch, never one call per row. */
export async function appendRows(tabName: string, headers: string[], rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const sheets = getClient();
  const values = rows.map((row) => headers.map((h) => stringifyCell(row[h])));
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

/** Overwrites one existing row in place, by its 1-indexed sheet row number. */
export async function updateRow(
  tabName: string,
  sheetRow: number,
  headers: string[],
  row: Record<string, unknown>,
): Promise<void> {
  const sheets = getClient();
  const values = [headers.map((h) => stringifyCell(row[h]))];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

/**
 * Overwrites many existing rows in ONE API call. A weekly upload can refresh
 * 150+ returning players at once; looping updateRow would burn 150 write
 * requests and trip the Sheets per-minute quota, so this is the only path
 * the ingest flow uses.
 */
export async function updateRows(
  tabName: string,
  headers: string[],
  updates: { sheetRow: number; row: Record<string, unknown> }[],
): Promise<void> {
  if (updates.length === 0) return;
  const sheets = getClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: updates.map((u) => ({
        range: `${tabName}!A${u.sheetRow}`,
        values: [headers.map((h) => stringifyCell(u.row[h]))],
      })),
    },
  });
}

function stringifyCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
