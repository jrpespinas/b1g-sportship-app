// Exports for the placement board.
//
// Two shapes, because they answer two different questions. The match sheet is
// "who could take each of these seekers" — one file the admin works from. The
// per-leader packet is "here are the people suggested for you" — what
// actually gets handed to a specific leader.
//
// **These files pair two people's contact details in a single row**, which is
// a larger disclosure than any other export in this app, where a row has only
// ever described one person. Both carry only what a placement conversation
// needs. Who may receive one is a policy question the app does not answer.

import type { SlimCandidate, SlimSeekerMatch } from "./matching";

function defuseFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCell(value: string): string {
  const safe = defuseFormula(value);
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(rows: string[][]): string {
  // Leading BOM so Excel reads UTF-8 — accented names arrive intact.
  return `﻿${rows.map((cells) => cells.map(escapeCell).join(",")).join("\r\n")}`;
}

const matchedList = (candidate: SlimCandidate) =>
  candidate.criteria.filter((c) => c.outcome === "met").map((c) => c.label).join(" + ") || "none";

const missedList = (candidate: SlimCandidate) =>
  candidate.criteria.filter((c) => c.outcome === "missed").map((c) => c.label).join(" + ") || "none";

/** One row per suggested pairing, best candidate first within each seeker. */
export function toMatchSheetCsv(board: SlimSeekerMatch[], perSeeker: number): string {
  const rows: string[][] = [
    [
      "Seeker",
      "Seeker email",
      "Seeker mobile",
      "Seeker is looking for",
      "Suggested leader",
      "Leader email",
      "Leader mobile",
      "Meets on",
      "Score",
      "Matches on",
      "Differs on",
    ],
  ];

  for (const match of board) {
    const shortlist = match.candidates.slice(0, perSeeker);
    if (shortlist.length === 0) {
      rows.push([
        match.seeker.name,
        match.seeker.email,
        match.seeker.mobile,
        match.wantsLine,
        "No candidate",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      continue;
    }
    for (const candidate of shortlist) {
      rows.push([
        match.seeker.name,
        match.seeker.email,
        match.seeker.mobile,
        match.wantsLine,
        candidate.leader.name,
        candidate.leader.email,
        candidate.leader.mobile,
        candidate.days.join(" / "),
        `${candidate.met} of ${candidate.evaluated}`,
        matchedList(candidate),
        missedList(candidate),
      ]);
    }
  }
  return toCsv(rows);
}

export interface LeaderPacket {
  leaderId: string;
  leaderName: string;
  seekerCount: number;
  csv: string;
}

/**
 * One packet per leader who appears in at least one seeker's shortlist. A
 * leader is never told about seekers they were not suggested for.
 */
export function toLeaderPackets(board: SlimSeekerMatch[], perSeeker: number): LeaderPacket[] {
  const byLeader = new Map<string, { name: string; rows: string[][] }>();

  for (const match of board) {
    for (const candidate of match.candidates.slice(0, perSeeker)) {
      const id = candidate.leader.playerId;
      const entry = byLeader.get(id) ?? { name: candidate.leader.name, rows: [] };
      entry.rows.push([
        match.seeker.name,
        match.seeker.email,
        match.seeker.mobile,
        match.wantsLine,
        candidate.days.join(" / "),
        `${candidate.met} of ${candidate.evaluated}`,
        matchedList(candidate),
        missedList(candidate),
      ]);
      byLeader.set(id, entry);
    }
  }

  return [...byLeader.entries()]
    .map(([leaderId, { name, rows }]) => ({
      leaderId,
      leaderName: name,
      seekerCount: rows.length,
      csv: toCsv([
        ["Seeker", "Email", "Mobile", "What they are looking for", "Meets on", "Score", "Matches on", "Differs on"],
        ...rows,
      ]),
    }))
    .sort((a, b) => b.seekerCount - a.seekerCount || a.leaderName.localeCompare(b.leaderName));
}

export function matchFilename(kind: string): string {
  const slug = kind.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "match";
  return `b1g-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
}
