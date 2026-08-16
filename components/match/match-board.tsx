"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Download, FolderDown, Minus, Search, X } from "lucide-react";
import { GenderMark } from "@/components/ui/gender-mark";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clsx } from "@/lib/clsx";
import { toLeaderPackets, toMatchSheetCsv, matchFilename } from "@/lib/match-export";
import type { CriterionKey, CriterionResult, SlimCandidate, SlimSeekerMatch } from "@/lib/matching";

/** How many suggestions travel into an export, per seeker. */
const SHORTLIST = 3;
const INITIAL_VISIBLE = 3;

/** Fixed column order, so a criterion lines up down the whole page. */
const CRITERIA_COLUMNS: { key: CriterionKey; label: string }[] = [
  { key: "location", label: "Location" },
  { key: "format", label: "Format" },
  { key: "age", label: "Age" },
  { key: "time", label: "Time" },
];

type Outcome = "strong" | "workable" | "hard" | "blocked";

const OUTCOME_LABEL: Record<Outcome, string> = {
  strong: "Strong",
  workable: "Workable",
  hard: "Needs a call",
  blocked: "Nobody to suggest",
};

function outcomeOf(match: SlimSeekerMatch): Outcome {
  const top = match.candidates[0];
  if (!top) return "blocked";
  const shortfall = top.evaluated - top.met;
  return shortfall === 0 ? "strong" : shortfall === 1 ? "workable" : "hard";
}

function download(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** The value a cell shows: what was compared, not just the verdict. */
function cellText(c: CriterionResult): string {
  if (c.outcome === "unknown") return "not stated";
  if (c.outcome === "met") return c.note ?? c.leaderValue ?? "";
  return c.note ?? (c.leaderValue ? `leads ${c.leaderValue}` : "");
}

function CriterionCell({ criterion }: { criterion: CriterionResult | undefined }) {
  if (!criterion) return <td className="py-2.5 pr-4 text-ink-tertiary">—</td>;
  const Icon = criterion.outcome === "met" ? Check : criterion.outcome === "missed" ? X : Minus;
  return (
    <td className="py-2.5 pr-4 align-top">
      <span className="flex items-baseline gap-1.5">
        <Icon
          className={clsx(
            "size-3 shrink-0 translate-y-[2px]",
            criterion.outcome === "met" ? "text-success" : "text-ink-tertiary",
          )}
          strokeWidth={criterion.outcome === "met" ? 3 : 2}
          aria-hidden
        />
        <span className={criterion.outcome === "met" ? "text-ink" : "text-ink-secondary"}>
          {cellText(criterion)}
        </span>
      </span>
      <span className="sr-only">
        {criterion.label}{" "}
        {criterion.outcome === "met" ? "matches" : criterion.outcome === "missed" ? "differs" : "not stated"}
      </span>
    </td>
  );
}

function CandidateRow({ candidate }: { candidate: SlimCandidate }) {
  const perfect = candidate.met === candidate.evaluated && candidate.evaluated > 0;
  const byKey = new Map(candidate.criteria.map((c) => [c.key, c]));

  return (
    <tr className="border-t border-border align-top">
      <td className="py-2.5 pl-5 pr-4">
        <Link
          href={`/players/${candidate.leader.playerId}`}
          className="rounded-[5px] font-medium text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {candidate.leader.name}
        </Link>
        {candidate.languageNote ? (
          <div className="text-[12px] text-ink-secondary">{candidate.languageNote}</div>
        ) : null}
      </td>
      {/* A fact, not a score: the gate guarantees it, so it carries no mark. */}
      <td className="py-2.5 pr-4 whitespace-nowrap text-ink">{candidate.days.join(", ")}</td>
      <td className="py-2.5 pr-4 whitespace-nowrap">
        <span className={clsx("tabular-nums", perfect ? "font-semibold text-success" : "text-ink-secondary")}>
          {candidate.met} of {candidate.evaluated}
        </span>
      </td>
      {CRITERIA_COLUMNS.map((col) => (
        <CriterionCell key={col.key} criterion={byKey.get(col.key)} />
      ))}
    </tr>
  );
}

function poolLine(match: SlimSeekerMatch): string {
  const noun = match.poolSize === 1 ? "leader" : "leaders";
  const who = match.gender ? `${match.gender} ${noun}` : noun;
  return `Compared against ${match.poolSize} ${who} meeting on a day they are free`;
}

function BlockedNote({ match }: { match: SlimSeekerMatch }) {
  const text =
    match.blockedReason === "seeker-gender-unknown"
      ? "No gender recorded for this person, and discipleship groups are not mixed — so nobody can be suggested until someone asks. Add it on their next registration and they will appear here."
      : match.blockedReason === "no-day-stated"
        ? "They have not said which days they are free, and a group that meets when someone cannot come is not a match. Ask them, and their candidates will appear here."
        : match.blockedReason === "no-same-gender-leader"
          ? `No ${match.gender} leader currently has capacity. This is a group that needs planting, not a match that needs finding.`
          : `No ${match.gender} leader with capacity meets on any day they are free. This is a group that needs planting on their day, not a match that needs finding.`;
  return <p className="px-5 py-4 text-[13px] text-ink-secondary">{text}</p>;
}

function SeekerPanel({ match }: { match: SlimSeekerMatch }) {
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const shown = match.candidates.slice(0, visible);
  const remaining = match.candidates.length - shown.length;
  const top = match.candidates[0];

  return (
    <Panel>
      <PanelHeader
        title={match.seeker.name}
        subtitle={
          <>
            {match.wantsLine ? (
              <>
                Looking for <span className="text-ink">{match.wantsLine}</span>
              </>
            ) : (
              "No preferences recorded — worth asking before suggesting anyone."
            )}
            {!match.blockedReason && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <GenderMark gender={match.gender} />
                {poolLine(match)}
              </div>
            )}
          </>
        }
        action={
          match.blockedReason || !top ? undefined : (
            <Badge
              tone={
                match.bestScore === top.evaluated ? "success" : top.evaluated - match.bestScore === 1 ? "neutral" : "accent"
              }
            >
              best {match.bestScore} of {top.evaluated}
            </Badge>
          )
        }
      />
      {match.blockedReason ? (
        <BlockedNote match={match} />
      ) : shown.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-ink-secondary">No leader with capacity to compare against yet.</p>
      ) : (
        <>
          <div className="relative">
            <div className="overflow-x-auto">
              {/* Fixed geometry, not content-sized: the whole point of columns
                  is scanning one criterion down the page, and auto layout gives
                  every seeker's table its own widths. */}
              <table className="w-full min-w-[900px] table-fixed text-left text-[13px]">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[9%]" />
                  <col className="w-[8%]" />
                  <col className="w-[16%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead>
                  <tr className="border-t border-border text-ink-secondary">
                    <th className="py-2 pl-5 pr-4 font-medium">Leader</th>
                    <th className="py-2 pr-4 font-medium">Meets</th>
                    <th className="py-2 pr-4 font-medium">Score</th>
                    {CRITERIA_COLUMNS.map((col) => (
                      <th key={col.key} className="py-2 pr-4 font-medium">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((candidate) => (
                    <CandidateRow key={candidate.leader.playerId} candidate={candidate} />
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-surface xl:hidden"
              aria-hidden
            />
          </div>
          {remaining > 0 && (
            <div className="border-t border-border px-5 py-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setVisible((v) => v + 5)}>
                Show {Math.min(5, remaining)} more of {match.totalCandidates} compared
              </Button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

export function MatchBoard({ board }: { board: SlimSeekerMatch[] }) {
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [gender, setGender] = useState("");
  const [day, setDay] = useState("");
  const [packetsOpen, setPacketsOpen] = useState(false);

  const outcomes = useMemo(() => new Map(board.map((m) => [m.seeker.playerId, outcomeOf(m)])), [board]);

  const dayOptions = useMemo(() => {
    const set = new Set<string>();
    board.forEach((m) => m.wantedDays.forEach((d) => set.add(d)));
    return [...set].sort();
  }, [board]);

  const genderOptions = useMemo(() => {
    const set = new Set<string>();
    board.forEach((m) => m.gender && set.add(m.gender));
    return [...set].sort();
  }, [board]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return board.filter((m) => {
      if (outcome && outcomes.get(m.seeker.playerId) !== outcome) return false;
      if (gender && m.gender !== gender) return false;
      if (day && !m.wantedDays.includes(day)) return false;
      if (q && !`${m.seeker.name} ${m.seeker.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [board, outcome, gender, day, query, outcomes]);

  const packets = useMemo(() => toLeaderPackets(filtered, SHORTLIST), [filtered]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    board.forEach((m) => {
      const o = outcomes.get(m.seeker.playerId)!;
      c[o] = (c[o] ?? 0) + 1;
    });
    return c;
  }, [board, outcomes]);

  const isFiltered = !!(query || outcome || gender || day);

  function reset() {
    setQuery("");
    setOutcome("");
    setGender("");
    setDay("");
  }

  if (board.length === 0) {
    return (
      <Panel className="flex h-[240px] items-center justify-center border-dashed p-5 text-center text-[13px] text-ink-secondary">
        Nobody is currently seeking a group. This fills in as people ask to join one.
      </Panel>
    );
  }

  const chips: { id: Outcome | ""; label: string; count: number }[] = [
    { id: "", label: "All seekers", count: board.length },
    ...(["strong", "workable", "hard", "blocked"] as Outcome[])
      .filter((o) => counts[o])
      .map((o) => ({ id: o, label: OUTCOME_LABEL[o], count: counts[o] })),
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by outcome">
        {chips.map((chip) => {
          const active = outcome === chip.id;
          return (
            <button
              key={chip.id || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => setOutcome(chip.id)}
              className={clsx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page",
                active
                  ? "border-accent bg-accent-tint text-accent-ink"
                  : "border-border bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink",
              )}
            >
              {chip.label}
              <span className="tabular-nums opacity-70">{chip.count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search seekers by name or email</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-tertiary"
            strokeWidth={2}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search seekers by name or email"
            className="w-full rounded-[8px] border border-border-strong bg-surface py-2 pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-tertiary focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="rounded-[8px] border border-border-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All genders</option>
          {genderOptions.map((g) => (
            // Capitalised here rather than with text-transform, which would
            // also have title-cased the "All genders" placeholder.
            <option key={g} value={g}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="rounded-[8px] border border-border-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">Any day wanted</option>
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {isFiltered && (
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
        )}
      </div>

      <Panel className="mt-3 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] leading-relaxed text-ink-secondary sm:max-w-[560px]">
          <span className="font-semibold tabular-nums text-ink">{filtered.length}</span> of {board.length} seekers
          shown. The sheet carries each one&apos;s top {SHORTLIST} suggestions and pairs two people&apos;s contact
          details in one row — more than any other export here — so send it only to whoever is making the
          placement.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 self-start sm:self-auto"
          disabled={filtered.length === 0}
          onClick={() => download(toMatchSheetCsv(filtered, SHORTLIST), matchFilename("match-sheet"))}
        >
          <Download className="size-3.5" strokeWidth={2} aria-hidden />
          Match sheet
        </Button>
      </Panel>

      {filtered.length === 0 ? (
        <Panel className="mt-3 flex h-[160px] flex-col items-center justify-center gap-2 p-5 text-center">
          <div className="text-[13px] text-ink-secondary">No seekers match this cut.</div>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Reset filters
          </Button>
        </Panel>
      ) : (
        <div className="mt-3 space-y-3">
          {filtered.map((match) => (
            <SeekerPanel key={match.seeker.playerId} match={match} />
          ))}
        </div>
      )}

      {packets.length > 0 && (
        <Panel className="mt-3">
          <PanelHeader
            title="Per-leader packets"
            icon={FolderDown}
            subtitle={`One file each, listing only the seekers suggested for that leader${
              isFiltered ? " within the current filter" : ""
            }. ${packets.length} leaders appear in a shortlist — you would download a packet after deciding, not before.`}
            action={
              <Button type="button" variant="ghost" size="sm" onClick={() => setPacketsOpen((o) => !o)}>
                {packetsOpen ? "Hide" : `Show ${packets.length}`}
              </Button>
            }
          />
          {packetsOpen && (
            <ul className="flex flex-wrap gap-2 px-5 py-4">
              {packets.map((packet) => (
                <li key={packet.leaderId}>
                  <button
                    type="button"
                    onClick={() => download(packet.csv, matchFilename(`packet-${packet.leaderName}`))}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-secondary outline-none transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <Download className="size-3 shrink-0" strokeWidth={2} aria-hidden />
                    {packet.leaderName}
                    <span className="tabular-nums opacity-70">{packet.seekerCount}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
