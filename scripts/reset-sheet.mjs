#!/usr/bin/env node
/**
 * DESTRUCTIVE. Clears every data row from all three tabs and rewrites the
 * header rows to the current schema, so the 17 historical exports can be
 * re-uploaded through the app and rebuild the estate truthfully.
 *
 * Why a full reset rather than replacing one night at a time: dedup keys off
 * the Players tab. Re-uploading Feb 28 while the players still exist would
 * match everyone as "returning", so isFirstParticipation would be false for
 * the entire season and the first-timer series would flatline. Clearing first
 * lets the dedup replay exactly as it did originally.
 *
 *   node scripts/backup-sheet.mjs      # required first
 *   node scripts/reset-sheet.mjs --confirm
 *
 * Refuses to run without --confirm, and without a backup taken today.
 */

import { google } from "googleapis";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Must stay identical to the *_HEADERS constants in lib/store.ts. The check
// below fails the run if any name here has drifted out of that file.
const HEADERS = {
  Players: [
    "player_id", "first_name", "last_name", "nickname", "email", "mobile_number",
    "gender", "civil_status", "dgroup_member_status", "dgroup_status",
    "dgroup_interested_in_joining", "dgroup_leading_willing_to_absorb", "church_affiliation",
    "first_seen_game_night_id", "first_seen_at", "last_updated_at", "raw_json",
  ],
  "Game Nights": [
    "game_night_id", "game_night_date", "uploaded_at", "uploaded_by", "source_filename",
    "row_count", "auto_confirmed_count", "flagged_count",
    "resolved_link_existing_count", "resolved_add_new_count", "resolved_skip_count",
  ],
  Participations: [
    "participation_id", "player_id", "game_night_id", "sport_selected", "skill_level",
    "is_first_participation", "submitted_at",
    "dgroup_status", "dgroup_interested_in_joining", "dgroup_leading_willing_to_absorb",
  ],
};

if (!process.argv.includes("--confirm")) {
  console.error("Refusing to run: this erases every row in the Sheet.");
  console.error("Re-run with --confirm once you have a backup you trust.");
  process.exit(1);
}

// --- guard 1: schema must match lib/store.ts -------------------------------
const storeSrc = readFileSync(join(ROOT, "lib/store.ts"), "utf-8");
for (const [tab, headers] of Object.entries(HEADERS)) {
  const missing = headers.filter((h) => !storeSrc.includes(`"${h}"`));
  if (missing.length) {
    console.error(`Schema drift for "${tab}": ${missing.join(", ")} not present in lib/store.ts.`);
    console.error("Reconcile the two before resetting, or the rebuilt tabs will be wrong.");
    process.exit(1);
  }
}

// --- guard 2: a backup must exist, taken today -----------------------------
const backupsDir = join(ROOT, "backups");
if (!existsSync(backupsDir)) {
  console.error("No backups/ directory. Run: node scripts/backup-sheet.mjs");
  process.exit(1);
}
const today = new Date().toISOString().slice(0, 10);
const fresh = readdirSync(backupsDir).filter((d) => d.startsWith(today));
if (fresh.length === 0) {
  console.error("No backup from today. Run: node scripts/backup-sheet.mjs");
  process.exit(1);
}
console.log(`Backup found: backups/${fresh.sort().at(-1)}`);

// --- go --------------------------------------------------------------------
const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split("\n")) {
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

const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

for (const [tab, headers] of Object.entries(HEADERS)) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${tab}!A1:ZZ`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.GOOGLE_SHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
  console.log(`${tab.padEnd(15)} cleared, ${headers.length} headers written`);
}

console.log("\nThe estate is empty. Now upload the 17 exports through /upload,");
console.log("oldest first (Feb 28 → Aug 1), so dedup and first-timer flags replay in order.");
