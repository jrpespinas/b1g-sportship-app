#!/usr/bin/env node
/**
 * Clears the attendance recorded for ONE game night, so it can be uploaded
 * again. Registration is never touched — this only blanks the check-in
 * columns that a check-in file writes.
 *
 *   node scripts/reset-attendance.mjs 2026-02-28
 *   node scripts/reset-attendance.mjs 2026-02-28 --confirm
 *
 * Guardrails, matching scripts/reset-sheet.mjs:
 *   - refuses without --confirm
 *   - refuses without a backup taken today
 *   - refuses if the date has no game night, or no attendance to clear
 *
 * Walk-in rows (registered = FALSE) are DELETED, not blanked: they exist only
 * because a check-in created them, so leaving them behind would strand a
 * participation with no registration and no attendance.
 *
 * Reads credentials out of .env.local without printing them.
 */

import { google } from "googleapis";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  let contents;
  try {
    contents = readFileSync(join(ROOT, ".env.local"), "utf-8");
  } catch {
    console.error("Could not read .env.local — run this from the project root.");
    process.exit(1);
  }
  const env = {};
  for (const line of contents.split("\n")) {
    const i = line.indexOf("=");
    if (i === -1) continue;
    let value = line.slice(i + 1);
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        /* leave as-is */
      }
    }
    env[line.slice(0, i).trim()] = value;
  }
  return env;
}

function hasBackupFromToday() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    return readdirSync(join(ROOT, "backups")).some((name) => name.startsWith(today));
  } catch {
    return false;
  }
}

const date = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const confirmed = process.argv.includes("--confirm");

if (!date) {
  console.error("Usage: node scripts/reset-attendance.mjs <YYYY-MM-DD> [--confirm]");
  process.exit(1);
}

const env = loadEnv();
const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = env.GOOGLE_SHEET_ID;

const read = async (tab) => {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A1:ZZ` });
  const values = res.data.values ?? [];
  const header = values[0] ?? [];
  const index = Object.fromEntries(header.map((h, i) => [h, i]));
  return { header, index, rows: values.slice(1) };
};

const nights = await read("Game Nights");
const nightRowOffset = nights.rows.findIndex((r) => r[nights.index.game_night_date] === date);
if (nightRowOffset === -1) {
  console.error(`No game night on ${date}. Nothing to reset.`);
  process.exit(1);
}
const night = nights.rows[nightRowOffset];
const gameNightId = night[nights.index.game_night_id];
const nightSheetRow = nightRowOffset + 2;

const parts = await read("Participations");
const attendedIdx = parts.index.attended_at;
const registeredIdx = parts.index.registered;
if (attendedIdx == null || registeredIdx == null) {
  console.error("The Sheet has no attendance columns yet — run scripts/add-attendance-headers.mjs first.");
  process.exit(1);
}

const mine = parts.rows
  .map((row, i) => ({ row, sheetRow: i + 2 }))
  .filter((r) => r.row[parts.index.game_night_id] === gameNightId);

const toBlank = mine.filter((r) => (r.row[attendedIdx] ?? "").trim() && r.row[registeredIdx] !== "FALSE");
const toDelete = mine.filter((r) => r.row[registeredIdx] === "FALSE");
const uploadedAt = (night[nights.index.attendance_uploaded_at] ?? "").trim();

console.log(`Game night ${date} (${gameNightId})`);
console.log(`  registrations on this night : ${mine.length}`);
console.log(`  check-ins to clear          : ${toBlank.length}`);
console.log(`  walk-in rows to delete      : ${toDelete.length}`);
console.log(`  attendance file recorded    : ${uploadedAt || "(none)"}`);

if (!uploadedAt && toBlank.length === 0 && toDelete.length === 0) {
  console.log("\nNothing to reset for this night.");
  process.exit(0);
}

if (!confirmed) {
  console.log("\nDry run. Re-run with --confirm to clear it.");
  process.exit(0);
}
if (!hasBackupFromToday()) {
  console.error("\nRefusing: no backup from today. Run `node scripts/backup-sheet.mjs` first.");
  process.exit(1);
}

const col = (i) => {
  let n = i + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

// Blank the three check-in cells on each registered row.
if (toBlank.length > 0) {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: toBlank.map((r) => ({
        range: `Participations!${col(attendedIdx)}${r.sheetRow}:${col(attendedIdx + 2)}${r.sheetRow}`,
        values: [["", "", "TRUE"]],
      })),
    },
  });
  console.log(`Cleared check-ins on ${toBlank.length} rows.`);
}

// Walk-ins exist only because a check-in created them.
if (toDelete.length > 0) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetId = meta.data.sheets.find((s) => s.properties.title === "Participations").properties.sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: toDelete
        .map((r) => r.sheetRow)
        .sort((a, b) => b - a) // bottom-up, so earlier indices stay valid
        .map((sheetRow) => ({
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: sheetRow - 1, endIndex: sheetRow },
          },
        })),
    },
  });
  console.log(`Deleted ${toDelete.length} walk-in rows.`);
}

// Clear the night's own attendance metadata last: while it is set, the app
// treats the night as already uploaded and blocks a re-run.
const firstIdx = nights.index.attendance_uploaded_at;
await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: `Game Nights!${col(firstIdx)}${nightSheetRow}:${col(firstIdx + 2)}${nightSheetRow}`,
  valueInputOption: "RAW",
  requestBody: { values: [["", "", ""]] },
});
console.log("Cleared the game night's attendance metadata.");
console.log(`\n${date} is ready for a fresh attendance upload.`);
