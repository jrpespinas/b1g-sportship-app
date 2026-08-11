#!/usr/bin/env node
/**
 * Read-only snapshot of every tab in the B1G Sportship Database, written to
 * ./backups/<timestamp>/ as both JSON (exact, for restore) and CSV (openable).
 *
 * Run this before anything that rewrites the Sheet — the backfill in
 * docs/spec/05-backfill.md will not proceed without a fresh one.
 *
 *   node scripts/backup-sheet.mjs
 *
 * Reads credentials out of .env.local without printing them.
 */

import { google } from "googleapis";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TABS = ["Players", "Game Nights", "Participations"];

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

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

const env = loadEnv();
const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(ROOT, "backups", stamp);
mkdirSync(outDir, { recursive: true });

let grandTotal = 0;
for (const tab of TABS) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${tab}!A1:ZZ`,
  });
  const values = res.data.values ?? [];
  const dataRows = Math.max(values.length - 1, 0);
  grandTotal += dataRows;

  const slug = tab.toLowerCase().replace(/\s+/g, "-");
  writeFileSync(join(outDir, `${slug}.json`), JSON.stringify(values, null, 2));
  writeFileSync(join(outDir, `${slug}.csv`), toCsv(values));
  console.log(`${tab.padEnd(15)} ${String(dataRows).padStart(6)} data rows`);
}

console.log(`\n${grandTotal} rows total`);
console.log(`Backup written to backups/${stamp}/`);
