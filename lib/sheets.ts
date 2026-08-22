// Thin wrapper around the Google Sheets API. This is the only file that
// knows about rows/ranges/columns — lib/store.ts consumes it as a plain
// object-array interface, so nothing above this layer knows Sheets exists.
// Server-only: the service-account key must never reach the client.

import "server-only";
import { gunzipSync, gzipSync } from "node:zlib";
import { unstable_cache, updateTag } from "next/cache";
import { google, sheets_v4 } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

let client: sheets_v4.Sheets | null = null;

function getClient(): sheets_v4.Sheets {
  if (client) return client;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey || !SHEET_ID) {
    const missing = [
      !email && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
      !rawKey && "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
      !SHEET_ID && "GOOGLE_SHEET_ID",
    ].filter(Boolean);
    // Names the variables that are actually missing, and does not claim the
    // fix is a local file: on a host these live in the project's environment
    // settings, and "set them in .env.local" sent people looking in a file
    // that is gitignored and therefore never deployed.
    throw new Error(
      `Missing Google Sheets credentials: ${missing.join(", ")}. Set them in .env.local for ` +
        "local work, or in the hosting environment's variables for a deployment.",
    );
  }

  /**
   * A PEM has real newlines. Environment variables frequently do not.
   *
   * `.env.local` expands `\n` inside a quoted value, so the key arrives
   * correctly locally; pasting the same JSON-escaped string into a hosting
   * dashboard usually does not, and the failure is an opaque OpenSSL decoder
   * error rather than anything naming the key. Normalising here costs nothing
   * when the value already contains real newlines and removes the single most
   * common way this deployment breaks.
   */
  const key = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

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

/**
 * One tab, fetched and returned **gzipped**, because Next's data cache refuses
 * any entry over 2MB and the Players tab is 3.5MB as header-keyed objects.
 *
 * The first version of this cached the expanded rows and silently failed:
 * `unstable_cache` still returns the value when the write is rejected, so the
 * page looked cached while re-fetching underneath, and the only symptom was
 * an unhandledRejection in the server log.
 *
 * Two changes get it under the limit without giving anything up. The wire
 * shape is the one the Sheets API already uses — headers once, then a values
 * matrix — instead of repeating all 80 column names on all 1,080 rows. Then
 * gzip, because sheet exports are extremely repetitive text.
 *
 * Measured on the real sheet: 3.54MB → 0.27MB base64, 13× under the limit,
 * costing 15ms to compress and **7ms to expand** against a ~900ms round-trip.
 * Verified lossless against the expanded form.
 *
 * Projecting `raw` down to the ~21 columns the app reads would also have fit,
 * and was rejected: it would make `Player.raw` mean different things on
 * different paths, which is a correctness hazard traded for memory.
 */
async function fetchTabCompressed(tabName: string): Promise<string> {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A1:ZZ`,
  });
  const values = res.data.values ?? [];
  const headers = (values[0] ?? []) as string[];
  const rows = values.slice(1);
  return gzipSync(JSON.stringify({ headers, rows })).toString("base64");
}

const fetchTabCached = unstable_cache(fetchTabCompressed, ["sheets-tab"], {
  tags: [SHEETS_TAG],
  revalidate: READ_TTL_SECONDS,
});

/** Reads every data row (below the frozen header) as header-keyed objects. */
export async function readTab(
  tabName: string,
): Promise<{ row: Record<string, string>; sheetRow: number }[]> {
  const packed = await fetchTabCached(tabName);
  const { headers, rows } = JSON.parse(gunzipSync(Buffer.from(packed, "base64")).toString()) as {
    headers: string[];
    rows: string[][];
  };
  if (rows.length === 0) return [];

  return rows.map((line, i) => {
    const row: Record<string, string> = {};
    headers.forEach((header, colIndex) => {
      row[header] = line[colIndex] ?? "";
    });
    return { row, sheetRow: i + 2 }; // +2: 1-indexed, plus the header row itself
  });
}

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

/**
 * Reads a tab out of **another** spreadsheet — the door check-in sheet a game
 * night points at.
 *
 * Deliberately uncached. The season data is read on every page render and is
 * worth the cache; this is read once, when an admin deliberately imports a
 * night, and caching it would mean an import silently replaying a five-minute
 * old copy of a sheet someone is still typing into.
 *
 * Failures are translated rather than propagated, because the two that
 * actually happen — the sheet is not shared with the service account, or the
 * URL points at nothing — are indistinguishable in the raw Google error and
 * completely different to fix.
 */
export type ExternalSheetResult =
  | { ok: true; title: string; values: string[][] }
  | { ok: false; reason: "not-shared" | "not-found" | "no-such-tab" | "unknown"; detail?: string };

export async function readExternalSheet(
  spreadsheetId: string,
  gid?: string,
): Promise<ExternalSheetResult> {
  const sheets = getClient();

  let title: string | undefined;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
    const tabs = meta.data.sheets ?? [];
    // A URL's `gid` is the tab's numeric id; the values API wants its name.
    const wanted = gid
      ? tabs.find((t) => String(t.properties?.sheetId ?? "") === gid)
      : tabs[0];
    if (!wanted) return { ok: false, reason: "no-such-tab" };
    title = wanted.properties?.title ?? undefined;
    if (!title) return { ok: false, reason: "no-such-tab" };
  } catch (error) {
    return { ok: false, ...classify(error) };
  }

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${title}!A1:ZZ`,
    });
    return { ok: true, title, values: (res.data.values ?? []) as string[][] };
  } catch (error) {
    return { ok: false, ...classify(error) };
  }
}

function classify(error: unknown): { reason: "not-shared" | "not-found" | "unknown"; detail?: string } {
  const status = (error as { status?: number; code?: number })?.status ?? (error as { code?: number })?.code;
  const detail = error instanceof Error ? error.message : undefined;
  if (status === 403) return { reason: "not-shared", detail };
  if (status === 404) return { reason: "not-found", detail };
  return { reason: "unknown", detail };
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
