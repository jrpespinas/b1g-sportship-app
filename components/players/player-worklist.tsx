"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Copy,
  Download,
  Minus,
  Search,
  Users,
} from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clsx } from "@/lib/clsx";
import { formatDate } from "@/lib/format-date";
import {
  DGROUP_CATEGORIES,
  DGROUP_SEGMENTS,
  getSegmentTone,
  type DGroupCategory,
  type DGroupSegment,
} from "@/lib/dgroup";
import { toWorklistCsv, worklistFilename } from "@/lib/player-export";
import { formatName, nameMatchesQuery, sortableName } from "@/lib/player-name";
import {
  WORKLIST_VIEWS,
  findMatchingView,
  getView,
  matchesCriteria,
  type WorklistCriteria,
} from "@/lib/player-views";
import type { PlayerSummary } from "@/lib/player-directory";

const PAGE_SIZE = 50;

/** Came to one of the last three nights — the line between active and lapsed. */
const ACTIVE_WITHIN_NIGHTS = 2;


/**
 * Movement is rare — 32 of 1080 — so it rides inside the Standing cell rather
 * than taking a column that would be blank on 97% of rows. An uncertain
 * change reads as "changed answer", never as a direction: the D12 / DGroup
 * Member wording overlap and round-trip answers are not journeys, and
 * printing an arrow on them would send someone to congratulate a mis-click.
 */
function MovementNote({ movement }: { movement: NonNullable<PlayerSummary["movement"]> }) {
  if (movement.uncertain) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-ink-secondary">
        <Minus className="size-3 shrink-0" strokeWidth={2} aria-hidden />
        changed answer, unclear
      </span>
    );
  }
  const forward = movement.direction === "forward";
  const Icon = forward ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-[12px]", forward ? "text-success" : "text-ink-secondary")}>
      <Icon className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
      {movement.from} → {movement.to}
    </span>
  );
}

function lastSeenLabel(nightsSince: number | undefined): string {
  if (nightsSince == null) return "Never";
  if (nightsSince === 0) return "Most recent night";
  return nightsSince === 1 ? "1 night ago" : `${nightsSince} nights ago`;
}

type SortKey = "name" | "segment" | "nights" | "lastSeen";
type SortDirection = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "name", label: "Player" },
  { key: "segment", label: "Standing" },
  { key: "nights", label: "Nights" },
  { key: "lastSeen", label: "Last registered" },
];

function compare(a: PlayerSummary, b: PlayerSummary, key: SortKey): number {
  switch (key) {
    case "name":
      return sortableName(a.player).localeCompare(sortableName(b.player));
    case "segment":
      return DGROUP_SEGMENTS.indexOf(a.segment) - DGROUP_SEGMENTS.indexOf(b.segment);
    case "nights":
      return a.gameNightCount - b.gameNightCount;
    case "lastSeen":
      // Ascending means most recently seen first — someone who has never
      // attended sorts to the far end rather than to the top as a 0 would.
      return (a.gameNightsSinceLastSeen ?? Infinity) - (b.gameNightsSinceLastSeen ?? Infinity);
  }
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ChevronsUpDown size={13} strokeWidth={2} className="text-ink-tertiary" />;
  return direction === "asc" ? (
    <ChevronUp size={13} strokeWidth={2} className="text-ink" />
  ) : (
    <ChevronDown size={13} strokeWidth={2} className="text-ink" />
  );
}

/**
 * What each funnel stage means once you are standing in its list. Written for
 * someone who arrived by clicking a bar, not for someone who built the filter.
 */
const CATEGORY_CUTS: Record<DGroupCategory, { label: string; note: string }> = {
  "DGroup Leader": {
    label: "DGroup leaders",
    note: "Leading a group today. The pool with room to take someone new.",
  },
  D12: {
    label: "D12",
    note: "Leading a group, and discipling other leaders. Counted with leaders everywhere else on the dashboard.",
  },
  "DGroup Member": {
    label: "DGroup members",
    note: "In a group and not leading one — the pool to invite into leadership.",
  },
  Seeking: {
    label: "Seeking a group",
    note: "Asked for a group and is not in one yet. These are the people to place.",
  },
  "Not involved": {
    label: "Asked, not involved",
    note: "Answered the discipleship question and is not in a group — said no, or is still deciding. They have been asked; the follow-up is a conversation, not an invitation.",
  },
  "Not recorded": {
    label: "Never asked",
    note: "No discipleship answer on file at all. Nobody knows where they stand, which makes this the shortest path to a real number.",
  },
};

export function PlayerWorklist({ players }: { players: PlayerSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // A `view` in the URL is an entry convention — the dashboard links in with
  // one. It is expanded into real criteria here and never written back, so
  // there is only ever one representation of the current cut.
  const initial = useMemo(() => {
    const view = getView(searchParams.get("view"));
    if (view) return view.criteria;
    const segment = searchParams.get("segment") as DGroupSegment | null;
    // The funnel links in by category, because "Leaders" spans two of them and
    // a row reading "D12 · 53" has to land on exactly those 53 people.
    const category = searchParams.get("category") as DGroupCategory | null;
    return {
      segment: segment && DGROUP_SEGMENTS.includes(segment) ? segment : undefined,
      category: category && DGROUP_CATEGORIES.includes(category) ? category : undefined,
      minNights: Number(searchParams.get("min")) || undefined,
      absorbOnly: searchParams.get("absorb") === "1",
    } satisfies WorklistCriteria;
    // Read once, on mount: this seeds state, it does not track the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [church, setChurch] = useState(searchParams.get("church") ?? "");
  const [criteria, setCriteria] = useState<WorklistCriteria>(initial);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const churchOptions = useMemo(() => {
    const set = new Set<string>();
    for (const { player } of players) {
      if (player.churchAffiliation?.trim()) set.add(player.churchAffiliation.trim());
    }
    return [...set].sort();
  }, [players]);

  const viewCounts = useMemo(
    () => WORKLIST_VIEWS.map((view) => players.filter((p) => matchesCriteria(p, view.criteria)).length),
    [players],
  );

  const filtered = useMemo(
    () =>
      players.filter((summary) => {
        if (!matchesCriteria(summary, criteria)) return false;
        if (church && (summary.player.churchAffiliation ?? "").trim() !== church) return false;
        return nameMatchesQuery(summary.player, query);
      }),
    [players, criteria, church, query],
  );

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const result = compare(a, b, sortKey);
      return sortDir === "asc" ? result : -result;
    });
  }, [filtered, sortKey, sortDir]);

  const activeView = findMatchingView(criteria);

  /**
   * A category arrival is a named cut, not a custom one. The dashboard's
   * funnel links straight in here, and landing a reader who clicked
   * "D12 · 53" on a panel headed "Custom cut" would make a deliberate link
   * look like a filter they had fiddled with themselves.
   */
  const categoryCut =
    criteria.category && !query && !church ? CATEGORY_CUTS[criteria.category] : undefined;

  // A custom cut can still be carrying criteria that have no visible control —
  // arriving on "Leaders with capacity" and then typing a name leaves
  // absorb-only switched on. Name them, or the count looks wrong.
  const hiddenRefinements = [
    criteria.absorbOnly ? "can absorb" : null,
    criteria.minNights ? `${criteria.minNights}+ nights attended` : null,
  ].filter(Boolean) as string[];
  const stillTurningUp = filtered.filter(
    (p) => (p.gameNightsSinceLastSeen ?? Infinity) <= ACTIVE_WITHIN_NIGHTS,
  ).length;
  const isCustom = !!query || !!church || !activeView;
  const hasAnyPlayers = players.length > 0;

  // Every control resets paging as it changes the set. Done at the call sites
  // rather than in an effect: leaving the reader 300 rows deep in a list that
  // just became 12 rows long strands them below the results, but syncing that
  // through an effect would cascade an extra render on every keystroke.
  function changeQuery(value: string) {
    setQuery(value);
    setVisible(PAGE_SIZE);
  }

  function changeChurch(value: string) {
    setChurch(value);
    setVisible(PAGE_SIZE);
  }

  function changeCriteria(next: WorklistCriteria) {
    setCriteria(next);
    setVisible(PAGE_SIZE);
  }

  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (church) params.set("church", church);
      if (criteria.segment) params.set("segment", criteria.segment);
      if (criteria.category) params.set("category", criteria.category);
      if (criteria.minNights) params.set("min", String(criteria.minNights));
      if (criteria.absorbOnly) params.set("absorb", "1");
      if (sortKey) {
        params.set("sort", sortKey);
        params.set("dir", sortDir);
      }
      router.replace(params.toString() ? `/players?${params}` : "/players", { scroll: false });
    }, 300);
    return () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    };
  }, [query, church, criteria, sortKey, sortDir, router]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setVisible(PAGE_SIZE);
  }

  function reset() {
    setQuery("");
    setChurch("");
    setCriteria({});
    setSortKey(null);
    setVisible(PAGE_SIZE);
  }

  function exportCsv() {
    const blob = new Blob([toWorklistCsv(sorted)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = worklistFilename(activeView?.label ?? "players");
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyEmails() {
    const emails = sorted.map((s) => s.player.email).filter(Boolean).join(", ");
    try {
      await navigator.clipboard.writeText(emails);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2400);
  }

  if (!hasAnyPlayers) {
    return (
      <Panel className="flex h-[240px] items-center justify-center border-dashed p-5 text-center text-[13px] text-ink-secondary">
        No players yet. Upload a roster to get started.
      </Panel>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Worklists">
        {WORKLIST_VIEWS.map((view, i) => {
          const isActive = !isCustom && activeView?.id === view.id;
          return (
            <button
              key={view.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setQuery("");
                setChurch("");
                changeCriteria(view.criteria);
              }}
              className={clsx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page pointer-coarse:min-h-11",
                isActive
                  ? "border-accent bg-accent-tint text-accent-ink"
                  : "border-border bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink",
              )}
            >
              {view.label}
              <span className="tabular-nums opacity-70">{viewCounts[i].toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search players by name or email</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-tertiary"
            strokeWidth={2}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-[8px] border border-border-strong bg-surface py-2 pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-tertiary focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11"
          />
        </label>
        <select
          value={criteria.segment ?? ""}
          onChange={(e) =>
            // Picking a standing clears any finer category arrived at from a
            // funnel link. The two would otherwise AND together and a reader
            // who chose "Leaders" on top of `?category=D12` would land on an
            // empty list with both controls looking satisfied.
            changeCriteria({
              ...criteria,
              category: undefined,
              segment: (e.target.value || undefined) as DGroupSegment | undefined,
            })
          }
          className="rounded-[8px] border border-border-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11"
        >
          <option value="">All standings</option>
          {DGROUP_SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={church}
          onChange={(e) => changeChurch(e.target.value)}
          className="rounded-[8px] border border-border-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11"
        >
          <option value="">All churches</option>
          {churchOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {isCustom && (
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
        )}
      </div>

      <Panel className="mt-4">
        <PanelHeader
          icon={Users}
          title={activeView && !isCustom ? activeView.label : (categoryCut?.label ?? "Custom cut")}
          subtitle={
            <>
              <p>
                {activeView && !isCustom
                  ? activeView.note
                  : (categoryCut?.note ??
                    (hiddenRefinements.length > 0
                      ? `Your own combination, still limited to ${hiddenRefinements.join(" and ")}.`
                      : "Your own combination of standing, church, and search."))}
              </p>
              <p className="mt-1">
                <span className="font-semibold tabular-nums text-ink">{sorted.length.toLocaleString()}</span> of{" "}
                {players.length.toLocaleString()} players
                {sorted.length > 0 && (
                  <>
                    {" · "}
                    <span className="tabular-nums">{stillTurningUp.toLocaleString()}</span> attended one of the last
                    three nights
                  </>
                )}
              </p>
            </>
          }
          action={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={copyEmails}
                disabled={sorted.length === 0}
              >
                {copyState === "copied" ? (
                  <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                ) : (
                  <Copy className="size-3.5" strokeWidth={2} aria-hidden />
                )}
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Couldn't copy"
                    : "Copy emails"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={exportCsv}
                disabled={sorted.length === 0}
              >
                <Download className="size-3.5" strokeWidth={2} aria-hidden />
                Export {sorted.length.toLocaleString()}
              </Button>
            </div>
          }
        />

        {sorted.length === 0 ? (
          <div className="flex h-[160px] flex-col items-center justify-center gap-2 p-5 text-center">
            <div className="text-[13px] text-ink-secondary">No players match this cut.</div>
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Reset filters
            </Button>
          </div>
        ) : (
          <>
            {/* Below sm the table's Standing column lands off-screen, and the
                segment badge is the one fact this list exists to show —
                scrolling sideways for it is a bad trade. Same rows, stacked,
                per DESIGN.md's stacking-not-reflow rule. */}
            <div className="sm:hidden">
              <label className="flex items-center gap-2 border-b border-border px-5 py-2.5">
                <span className="text-[12px] text-ink-secondary">Sort</span>
                <select
                  value={sortKey ?? ""}
                  onChange={(e) => {
                    const key = e.target.value as SortKey | "";
                    setSortKey(key || null);
                    setSortDir("asc");
                    setVisible(PAGE_SIZE);
                  }}
                  className="flex-1 rounded-[8px] border border-border-strong bg-surface px-2 py-1.5 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="">Roster order</option>
                  {SORT_COLUMNS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <ul>
                {sorted.slice(0, visible).map(({ player, segment, willingToAbsorb, gameNightCount, gameNightsSinceLastSeen, lastSeenDate, movement }) => (
                  <li key={player.playerId} className="border-b border-border last:border-0">
                    <Link
                      href={`/players/${player.playerId}`}
                      className="block px-5 py-3 outline-none focus-visible:bg-surface-subtle"
                    >
                      <div className="text-[13px] font-medium text-ink">{formatName(player)}</div>
                      <div className="text-[12px] text-ink-secondary">{player.email}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone={getSegmentTone(segment)}>{segment}</Badge>
                        {willingToAbsorb && <Badge tone="success">Can absorb</Badge>}
                      </div>
                      {movement && (
                        <div className="mt-1.5">
                          <MovementNote movement={movement} />
                        </div>
                      )}
                      <div className="mt-1.5 text-[12px] text-ink-secondary">
                        <span className="tabular-nums">{gameNightCount}</span>{" "}
                        {gameNightCount === 1 ? "night" : "nights"} · {lastSeenLabel(gameNightsSinceLastSeen)}
                        {lastSeenDate ? `, ${formatDate(lastSeenDate)}` : ""}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden sm:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-ink-secondary">
                      {SORT_COLUMNS.map(({ key, label }) => (
                        <th
                          key={key}
                          className={clsx(
                            "py-2.5 font-medium",
                            key === "name" && "pl-5",
                            key === "lastSeen" && "pr-5",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleSort(key)}
                            className={clsx(
                              "inline-flex items-center gap-1 rounded-[5px] outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                              sortKey === key ? "text-ink" : "text-ink-secondary",
                            )}
                          >
                            {label}
                            <SortIcon active={sortKey === key} direction={sortDir} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.slice(0, visible).map((summary) => {
                      const { player } = summary;
                      return (
                        <tr key={player.playerId} className="border-b border-border last:border-0 hover:bg-surface-subtle">
                          <td className="py-2.5 pl-5">
                            <Link
                              href={`/players/${player.playerId}`}
                              className="inline-flex items-center rounded-[5px] font-medium text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface pointer-coarse:min-h-11"
                            >
                              {formatName(player)}
                            </Link>
                            <div className="text-[12px] text-ink-secondary">{player.email}</div>
                          </td>
                          <td className="py-2.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge tone={getSegmentTone(summary.segment)}>{summary.segment}</Badge>
                              {summary.willingToAbsorb && <Badge tone="success">Can absorb</Badge>}
                            </div>
                            {summary.movement && (
                              <div className="mt-1">
                                <MovementNote movement={summary.movement} />
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 tabular-nums text-ink">{summary.gameNightCount}</td>
                          <td className="py-2.5 pr-5">
                            <div className="text-ink">{lastSeenLabel(summary.gameNightsSinceLastSeen)}</div>
                            {summary.lastSeenDate && (
                              <div className="text-[12px] tabular-nums text-ink-secondary">
                                {formatDate(summary.lastSeenDate)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3">
              <p className="text-[12px] text-ink-secondary">
                Showing <span className="tabular-nums">{Math.min(visible, sorted.length).toLocaleString()}</span> of{" "}
                <span className="tabular-nums">{sorted.length.toLocaleString()}</span>
              </p>
              {visible < sorted.length && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  Show {Math.min(PAGE_SIZE, sorted.length - visible)} more
                </Button>
              )}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
