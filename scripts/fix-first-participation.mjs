#!/usr/bin/env node
/**
 * Re-syncs the stored `is_first_participation` column with history.
 *
 * The app no longer trusts that column — lib/first-participation.ts derives it
 * on every read — but the Sheet is still what people open directly, and it
 * should not contradict the app. Uploads arriving out of date order (Apr 25
 * after Aug 1, Jul 11 after Jul 18) left 85 rows wrong as of 2026-10-27.
 *
 * The rule, which must stay in step with lib/first-participation.ts: a
 * person's first night is the earliest game night by date on which they
 * appear at all, registered or walked in. Exactly one row per person is
 * marked; on a tie within that night the registered row wins, then sheet
 * order.
 *
 * Writes only the one column, and only the cells that change. Safe to re-run
 * after any out-of-order upload.
 *
 *   node scripts/fix-first-participation.mjs            # dry run, shows the plan
 *   node scripts/fix-first-participation.mjs --confirm  # needs a backup from today
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

const confirmed = process.argv.includes("--confirm");

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
const dateById = new Map(
  nights.rows.map((r) => [r[nights.index.game_night_id], r[nights.index.game_night_date]]),
);

const parts = await read("Participations");
const firstIdx = parts.index.is_first_participation;
if (firstIdx == null) {
  console.error("The Participations tab has no is_first_participation column.");
  process.exit(1);
}
const cell = (row, name) => row[parts.index[name]] ?? "";
// A blank `registered` predates attendance and means a registration row.
const isRegistered = (row) => cell(row, "registered") !== "FALSE";

const firstByPlayer = new Map();
parts.rows.forEach((row, i) => {
  const date = dateById.get(cell(row, "game_night_id"));
  if (!date) return;
  const playerId = cell(row, "player_id");
  const registered = isRegistered(row);
  const current = firstByPlayer.get(playerId);
  const earlier = !current || date < current.date;
  const sameNightButRegistered = !!current && date === current.date && registered && !current.registered;
  if (earlier || sameNightButRegistered) firstByPlayer.set(playerId, { i, date, registered });
});

const changes = [];
const byNight = new Map();
parts.rows.forEach((row, i) => {
  const expected = firstByPlayer.get(cell(row, "player_id"))?.i === i;
  const stored = String(row[firstIdx] ?? "").toUpperCase() === "TRUE";
  if (expected === stored) return;
  changes.push({ sheetRow: i + 2, value: expected ? "TRUE" : "FALSE" });
  const date = dateById.get(cell(row, "game_night_id")) ?? "(unknown night)";
  const entry = byNight.get(date) ?? { toFirst: 0, toReturnee: 0 };
  entry[expected ? "toFirst" : "toReturnee"] += 1;
  byNight.set(date, entry);
});

console.log(`Participations rows      : ${parts.rows.length}`);
console.log(`People with a first night: ${firstByPlayer.size}`);
console.log(`Cells to change          : ${changes.length}`);
for (const [date, e] of [...byNight.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${date}  +${e.toFirst} first-timer  +${e.toReturnee} returnee`);
}

if (changes.length === 0) {
  console.log("\nThe stored column already matches history. Nothing to do.");
  process.exit(0);
}
if (!confirmed) {
  console.log("\nDry run. Re-run with --confirm to write these cells.");
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

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId,
  requestBody: {
    valueInputOption: "RAW",
    data: changes.map((c) => ({
      range: `Participations!${col(firstIdx)}${c.sheetRow}`,
      values: [[c.value]],
    })),
  },
});
console.log(`\nWrote ${changes.length} cells.`);
