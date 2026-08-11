"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clsx } from "@/lib/clsx";
import { DGROUP_CATEGORIES, getDGroupCategoryTone, type DGroupCategory } from "@/lib/dgroup";
import type { PlayerSummary } from "@/lib/player-directory";

function displayName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

function matchesQuery(summary: PlayerSummary, query: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  return (
    displayName(summary.player).toLowerCase().includes(q) ||
    summary.player.email.toLowerCase().includes(q)
  );
}

type SortKey = "name" | "email" | "dgroup" | "gameNights";
type SortDirection = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "name", label: "Name", align: "left" },
  { key: "email", label: "Email", align: "left" },
  { key: "dgroup", label: "DGroup status", align: "left" },
  { key: "gameNights", label: "Game nights", align: "right" },
];

function compareSummaries(a: PlayerSummary, b: PlayerSummary, key: SortKey): number {
  switch (key) {
    case "name":
      return displayName(a.player).localeCompare(displayName(b.player));
    case "email":
      return a.player.email.localeCompare(b.player.email);
    case "dgroup":
      // Ordered by the category's own priority (Leader first, Not involved
      // last), not alphabetically — an alphabetical sort of these five
      // labels would put "D12" ahead of "DGroup Leader" for no reason an
      // admin would find meaningful.
      return DGROUP_CATEGORIES.indexOf(a.dgroupCategory) - DGROUP_CATEGORIES.indexOf(b.dgroupCategory);
    case "gameNights":
      return a.gameNightCount - b.gameNightCount;
  }
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ChevronsUpDown size={14} strokeWidth={2} className="text-ink-tertiary" />;
  return direction === "asc" ? (
    <ChevronUp size={14} strokeWidth={2} className="text-ink" />
  ) : (
    <ChevronDown size={14} strokeWidth={2} className="text-ink" />
  );
}

export function PlayerDirectoryTable({ players }: { players: PlayerSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [dgroupFilter, setDgroupFilter] = useState(searchParams.get("dgroup") ?? "");
  const [churchFilter, setChurchFilter] = useState(searchParams.get("church") ?? "");
  const initialSort = searchParams.get("sort");
  const [sortKey, setSortKey] = useState<SortKey | null>(
    SORT_COLUMNS.some((c) => c.key === initialSort) ? (initialSort as SortKey) : null,
  );
  const [sortDir, setSortDir] = useState<SortDirection>(searchParams.get("dir") === "desc" ? "desc" : "asc");

  const churchOptions = useMemo(() => {
    const set = new Set<string>();
    for (const { player } of players) {
      if (player.churchAffiliation?.trim()) set.add(player.churchAffiliation.trim());
    }
    return [...set].sort();
  }, [players]);

  function syncUrl(next: { q?: string; dgroup?: string; church?: string; sort?: string; dir?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = {
      q: query,
      dgroup: dgroupFilter,
      church: churchFilter,
      sort: sortKey ?? "",
      dir: sortKey ? sortDir : "",
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`/players?${params.toString()}`, { scroll: false });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      const nextDir: SortDirection = sortDir === "asc" ? "desc" : "asc";
      setSortDir(nextDir);
      syncUrl({ sort: key, dir: nextDir });
    } else {
      setSortKey(key);
      setSortDir("asc");
      syncUrl({ sort: key, dir: "asc" });
    }
  }

  const filtered = players.filter((summary) => {
    if (!matchesQuery(summary, query)) return false;
    if (dgroupFilter && summary.dgroupCategory !== dgroupFilter) return false;
    if (churchFilter && (summary.player.churchAffiliation ?? "").trim() !== churchFilter) return false;
    return true;
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const result = compareSummaries(a, b, sortKey);
        return sortDir === "asc" ? result : -result;
      })
    : filtered;

  const hasAnyPlayers = players.length > 0;
  const hasActiveFilters = !!(query || dgroupFilter || churchFilter);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-tertiary"
            strokeWidth={2}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              syncUrl({ q: e.target.value });
            }}
            placeholder="Search by name or email"
            className="w-full rounded-[10px] border border-border-strong bg-surface py-2 pl-9 pr-3 text-[15px] text-ink outline-none placeholder:text-ink-tertiary focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
        <select
          value={dgroupFilter}
          onChange={(e) => {
            setDgroupFilter(e.target.value);
            syncUrl({ dgroup: e.target.value });
          }}
          className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All DGroup status</option>
          {DGROUP_CATEGORIES.map((c: DGroupCategory) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={churchFilter}
          onChange={(e) => {
            setChurchFilter(e.target.value);
            syncUrl({ church: e.target.value });
          }}
          className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All churches</option>
          {churchOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {!hasAnyPlayers ? (
        <Card className="mt-6 flex h-[200px] items-center justify-center border-dashed p-5 text-center text-[15px] text-ink-tertiary">
          No players yet. Upload a roster to get started.
        </Card>
      ) : sorted.length === 0 ? (
        <Card className="mt-6 flex h-[160px] flex-col items-center justify-center gap-2 border-dashed p-5 text-center">
          <div className="text-[15px] text-ink-tertiary">No players match {hasActiveFilters ? "these filters" : "your search"}.</div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQuery("");
                setDgroupFilter("");
                setChurchFilter("");
                const params = new URLSearchParams();
                if (sortKey) {
                  params.set("sort", sortKey);
                  params.set("dir", sortDir);
                }
                router.replace(params.toString() ? `/players?${params.toString()}` : "/players", { scroll: false });
              }}
            >
              Clear filters
            </Button>
          )}
        </Card>
      ) : (
        <Card className="relative mt-6 p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-ink-secondary">
                  {SORT_COLUMNS.map(({ key, label, align }) => (
                    <th
                      key={key}
                      className={clsx(
                        "py-3 font-medium",
                        key === "name" && "pl-5",
                        key === "gameNights" && "pr-5",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                        className={clsx(
                          "inline-flex items-center gap-1 rounded-[5px] outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                          align === "right" && "flex-row-reverse",
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
                {sorted.map(({ player, dgroupCategory, gameNightCount }) => (
                  <tr key={player.playerId} className="border-b border-border last:border-0 hover:bg-surface-subtle">
                    <td className="p-0">
                      <Link href={`/players/${player.playerId}`} className="block py-3 pl-5 font-medium text-ink">
                        {displayName(player)}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/players/${player.playerId}`} className="block py-3 text-ink-secondary">
                        {player.email}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/players/${player.playerId}`} className="block py-3">
                        <Badge tone={getDGroupCategoryTone(dgroupCategory)}>{dgroupCategory}</Badge>
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/players/${player.playerId}`} className="block py-3 pr-5 tabular-nums text-ink">
                        {gameNightCount}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-surface sm:hidden"
            aria-hidden
          />
        </Card>
      )}
    </div>
  );
}
