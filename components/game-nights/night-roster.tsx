"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { SortIcon, type SortDirection } from "@/components/ui/sort-icon";
import { clsx } from "@/lib/clsx";

/**
 * One night's roster, sortable and filterable.
 *
 * Projected down to what the table draws rather than taking `Player` whole: a
 * night carries up to 180 people and `Player.raw` is the entire 80-column form
 * response, so passing the objects through would put megabytes into the page
 * to render four columns.
 */
export interface NightRosterRow {
  playerId: string;
  name: string;
  /** What they played if the door recorded it, else what they signed up for. */
  sport: string;
  /** `HH:MM` as written at the door, or undefined if they never arrived. */
  arrivedAt?: string;
  registered: boolean;
  firstTime: boolean;
}

type SortKey = "name" | "sport" | "arrived" | "firstTime";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Player" },
  { key: "sport", label: "Sport" },
  { key: "arrived", label: "Checked in" },
  { key: "firstTime", label: "First time?" },
];

type StatusFilter = "all" | "came" | "missed" | "walkIn";

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "Everyone",
  came: "Came",
  missed: "Did not come",
  walkIn: "Walked in",
};

function compare(a: NightRosterRow, b: NightRosterRow, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "sport":
      return a.sport.localeCompare(b.sport);
    case "arrived":
      return (a.arrivedAt ?? "").localeCompare(b.arrivedAt ?? "");
    case "firstTime":
      return Number(b.firstTime) - Number(a.firstTime);
  }
}

export function NightRoster({
  rows,
  hasAttendance,
  live,
}: {
  rows: NightRosterRow[];
  /** False until a check-in list exists — the column means nothing without one. */
  hasAttendance: boolean;
  /**
   * Set while a night is reading its door sheet and has not been imported.
   * These arrivals are provisional: matched by name only, nothing written.
   */
  live?: { count: number; unresolved: number; total: number };
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sport, setSport] = useState("");
  const [firstOnly, setFirstOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const sports = useMemo(() => [...new Set(rows.map((r) => r.sport).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      if (sport && row.sport !== sport) return false;
      if (firstOnly && !row.firstTime) return false;
      if (status === "came" && !row.arrivedAt) return false;
      if (status === "missed" && row.arrivedAt) return false;
      if (status === "walkIn" && row.registered) return false;
      return true;
    });
  }, [rows, query, sport, firstOnly, status]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      // Somebody who never arrived has no place on a time axis, so they sit at
      // the bottom in both directions. Letting the flip carry them to the top
      // would put eighty no-shows above the arrivals on "latest first", which
      // is never the question being asked.
      if (sortKey === "arrived" && !a.arrivedAt !== !b.arrivedAt) return a.arrivedAt ? -1 : 1;
      const result = compare(a, b, sortKey);
      return sortDir === "asc" ? result : -result;
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  // A status that cannot mean anything yet is not offered: without a check-in
  // list, "did not come" would silently return everybody.
  const statuses: StatusFilter[] = ["all", "came", "missed", "walkIn"];

  return (
    <Panel>
      <PanelHeader
        icon={Users}
        title="Who was on the list"
        subtitle={
          hasAttendance
            ? "Everyone who registered, plus anyone who walked in."
            : live
              ? `Checking in live from the door sheet — ${live.count} of ${live.total} matched by name so far. Nothing is recorded until the night is imported.`
              : "Everyone who registered. Attendance fills in once a check-in list is imported."
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        <label className="relative min-w-[180px] flex-1">
          <span className="sr-only">Search this night by name</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-tertiary"
            strokeWidth={2}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            className="w-full rounded-[8px] border border-border-strong bg-surface py-2 pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-tertiary focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11"
          />
        </label>

        {(hasAttendance || live) && (
          <div className="flex rounded-[7px] border border-border-strong p-0.5" role="group" aria-label="Attendance">
            {statuses.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                aria-pressed={status === option}
                className={clsx(
                  "rounded-[5px] px-2 py-1 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11",
                  status === option ? "bg-surface-subtle text-ink" : "text-ink-secondary hover:text-ink",
                )}
              >
                {STATUS_LABEL[option]}
              </button>
            ))}
          </div>
        )}

        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          aria-label="Sport"
          className="rounded-[8px] border border-border-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11"
        >
          <option value="">All sports</option>
          {sports.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setFirstOnly((on) => !on)}
          aria-pressed={firstOnly}
          className={clsx(
            "rounded-full border px-3 py-1.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11",
            firstOnly
              ? "border-accent bg-accent-tint text-accent-ink"
              : "border-border-strong text-ink-secondary hover:text-ink",
          )}
        >
          First-timers
        </button>
      </div>

      <p className="px-5 pt-3 text-[12px] text-ink-secondary" aria-live="polite">
        <span className="font-medium tabular-nums text-ink">{sorted.length}</span>
        {sorted.length === rows.length ? " on the list" : ` of ${rows.length} on the list`}
      </p>

      {sorted.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-ink-secondary">Nobody on this night matches those filters.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="border-t border-border text-ink-secondary">
                {COLUMNS.map((column, i) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={clsx("py-2 pr-4 font-medium", i === 0 && "pl-5")}
                    aria-sort={sortKey === column.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="inline-flex items-center gap-1 rounded-[5px] font-medium outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11"
                    >
                      {column.label}
                      <SortIcon active={sortKey === column.key} direction={sortDir} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.playerId} className="border-t border-border">
                  <td className="py-2.5 pl-5 pr-4">
                    <Link
                      href={`/players/${row.playerId}`}
                      className="inline-flex items-center rounded-[5px] font-medium text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface pointer-coarse:min-h-11"
                    >
                      {row.name}
                    </Link>
                    {!row.registered && (
                      <div className="text-[12px] text-ink-secondary">attended without registering</div>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-secondary">{row.sport}</td>
                  <td className="py-2.5 pr-4">
                    {row.arrivedAt ? (
                      <span className="tabular-nums text-ink">{row.arrivedAt}</span>
                    ) : hasAttendance ? (
                      <span className="text-ink-secondary">did not attend</span>
                    ) : live ? (
                      // "Not yet" while the door is still open. Saying "did not
                      // attend" at 5pm would call a no-show on someone who is
                      // parking the car.
                      <span className="text-ink-secondary">not yet</span>
                    ) : (
                      <span className="text-ink-tertiary">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-5 text-ink-secondary">{row.firstTime ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
