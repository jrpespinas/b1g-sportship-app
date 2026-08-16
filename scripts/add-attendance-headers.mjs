#!/usr/bin/env node
/**
 * Adds the six attendance column names to row 1 of the Sheet.
 *
 * Why this exists: `lib/sheets.ts` writes rows positionally from the header
 * arrays in `lib/store.ts`, but nothing ever wrote those names into the
 * Sheet's own header row. So the first attendance upload landed correctly in
 * columns K–M — and `readTab`, which keys off row 1, could not see any of it.
 * 78 real check-ins were sitting in unnamed columns.
 *
 * This is additive. It writes only to row 1, and only to cells that are
 * currently empty. No data row is touched.
 *
 *   node scripts/add-attendance-headers.mjs           # dry run, shows the plan
 *   node scripts/add-attendance-headers.mjs --confirm
 *
 * Reads credentials out of .env.local without printing them.
 */

import { google } from "googleapis";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Must stay in step with the header arrays in lib/store.ts. */
const EXPECTED = {
  "Game Nights": ["attendance_uploaded_at", "attendance_source_filename", "attendance_count"],
  Participations: ["attended_at", "attended_sport", "registered"],
};

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

const columnLetter = (index) => {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

const confirmed = process.argv.includes("--confirm");
const env = loadEnv();
const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = env.GOOGLE_SHEET_ID;

const plan = [];

for (const [tab, wanted] of Object.entries(EXPECTED)) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A1:ZZ1`,
  });
  const header = res.data.values?.[0] ?? [];
  const missing = wanted.filter((name) => !header.includes(name));

  if (missing.length === 0) {
    console.log(`${tab}: already has all ${wanted.length} attendance columns — nothing to do.`);
    continue;
  }

  // Append after the last named column, preserving whatever order the sheet
  // already uses. Values already sitting in those positions stay put; only
  // the name in row 1 is being supplied.
  const startIndex = header.length;
  const range = `${tab}!${columnLetter(startIndex)}1:${columnLetter(startIndex + missing.length - 1)}1`;
  plan.push({ tab, range, missing });
  console.log(`${tab}: header has ${header.length} columns, missing ${missing.length}`);
  console.log(`   will write ${missing.join(", ")} into ${range}`);
}

if (plan.length === 0) process.exit(0);

if (!confirmed) {
  console.log("\nDry run. Re-run with --confirm to write these header names.");
  process.exit(0);
}

for (const { tab, range, missing } of plan) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [missing] },
  });
  console.log(`${tab}: wrote ${missing.length} header names.`);
}

console.log("\nDone. Re-run scripts/backup-sheet.mjs to confirm the columns now read back.");
