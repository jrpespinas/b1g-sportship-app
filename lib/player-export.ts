// CSV export for a worklist.
//
// This file leaves the app and lands with DGroup leaders and volunteers, so
// it deliberately carries only the fields someone needs to make contact and
// know why this person is on their list. Everything else the roster holds —
// birth year, home address, emergency contact, medical conditions, and the
// whole `raw` passthrough — stays out. See docs/spec/02-player-inventory.md.

import type { PlayerSummary } from "./player-directory";
import { displayNickname } from "./player-name";

// Name is split into three columns rather than one joined string: the whole
// reason this is a CSV is that a DGroup leader can re-sort and filter it in
// Sheets, and "Sandoval, Jan Miguel (JM)" is one opaque cell to a spreadsheet.
const HEADERS = [
  "Last name",
  "First name",
  "Nickname",
  "Email",
  "Mobile",
  "Standing",
  "Can absorb",
  "Nights attended",
  "Last game night",
  "Church",
];

/**
 * A leading =, +, - or @ makes a spreadsheet treat the cell as a formula.
 * These names come from a public form and land in someone else's Sheets, so
 * neutralize the prefix rather than trusting the input.
 */
function defuseFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCell(value: string): string {
  const safe = defuseFormula(value);
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toRow(summary: PlayerSummary): string[] {
  const { player } = summary;
  return [
    player.lastName ?? "",
    player.firstName ?? "",
    displayNickname(player),
    player.email ?? "",
    player.mobileNumber ?? "",
    summary.segment,
    summary.willingToAbsorb ? "Yes" : "",
    String(summary.gameNightCount),
    summary.lastSeenDate ?? "",
    player.churchAffiliation ?? "",
  ];
}

export function toWorklistCsv(rows: PlayerSummary[]): string {
  const lines = [HEADERS, ...rows.map(toRow)].map((cells) => cells.map(escapeCell).join(","));
  // Leading BOM so Excel reads the file as UTF-8 — without it, accented
  // names in the roster arrive mangled on a Windows machine.
  return `﻿${lines.join("\r\n")}`;
}

export function worklistFilename(viewLabel: string): string {
  const slug =
    viewLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "players";
  return `b1g-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
}
