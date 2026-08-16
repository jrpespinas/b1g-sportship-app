// The named cuts of the roster that leadership actually acts on.
//
// These exist because the raw filters (segment, church, search) can express
// them but nobody assembles three dropdowns from memory. Each one maps to a
// reason the ministry gave for wanting this app at all: place the seekers,
// find who can absorb them, talk to the people who keep coming and still
// aren't connected, and nudge long-standing members toward leading.

import type { DGroupCategory, DGroupSegment } from "./dgroup";
import type { PlayerSummary } from "./player-directory";

export interface WorklistCriteria {
  segment?: DGroupSegment;
  /**
   * The finer cut, for links that must return exactly what a figure counted.
   * "Leaders" spans two categories, so a funnel row reading "D12 · 53" can
   * only land on its own 53 people through this.
   */
  category?: DGroupCategory;
  /** Minimum game nights attended — "they keep coming" as a number. */
  minNights?: number;
  absorbOnly?: boolean;
  /** Only the few whose standing ever changed — 32 of 1080 this season. */
  movedOnly?: boolean;
}

export interface WorklistView {
  id: string;
  label: string;
  /**
   * The explanation line. Required, not decorative: this register's rule is
   * that a count never appears without a sentence saying what it counts and
   * what to do about it.
   */
  note: string;
  criteria: WorklistCriteria;
}

export const WORKLIST_VIEWS: WorklistView[] = [
  {
    id: "all",
    label: "All players",
    note: "Everyone who has attended at least one game night.",
    criteria: {},
  },
  {
    id: "seekers",
    label: "Seekers",
    note: "Asked to join a discipleship group and aren't in one yet. These are the people to place.",
    criteria: { segment: "Seekers" },
  },
  {
    id: "capacity",
    label: "Leaders with capacity",
    note: "Leaders who said they can take new members — this is where seekers get placed.",
    criteria: { segment: "Leaders", absorbOnly: true },
  },
  {
    id: "unconnected",
    label: "Not involved, 3+ nights",
    note: "They keep turning up and still aren't in a group, and haven't asked to be. The in-person conversation.",
    criteria: { segment: "Not involved", minNights: 3 },
  },
  {
    id: "tenured",
    label: "Members, 5+ nights",
    note: "Long-attending group members — the people to nudge toward leading one themselves.",
    criteria: { segment: "Members", minNights: 5 },
  },
  {
    id: "moved",
    label: "Moved this season",
    note: "Everyone whose answer about where they stand changed at least once. Rare — most people never re-answer the question, so this is a short list by nature.",
    criteria: { movedOnly: true },
  },
];

export function matchesCriteria(summary: PlayerSummary, criteria: WorklistCriteria): boolean {
  if (criteria.segment && summary.segment !== criteria.segment) return false;
  if (criteria.category && summary.dgroupCategory !== criteria.category) return false;
  if (criteria.minNights != null && summary.gameNightCount < criteria.minNights) return false;
  if (criteria.absorbOnly && !summary.willingToAbsorb) return false;
  if (criteria.movedOnly && !summary.movement) return false;
  return true;
}

/**
 * Which preset the current criteria are exactly, if any. Editing a filter on
 * top of a view drops back to no match, which the UI reports as a custom cut
 * rather than silently keeping a view highlighted that no longer describes
 * what is on screen.
 */
export function findMatchingView(criteria: WorklistCriteria): WorklistView | undefined {
  return WORKLIST_VIEWS.find(
    (view) =>
      (view.criteria.segment ?? "") === (criteria.segment ?? "") &&
      (view.criteria.category ?? "") === (criteria.category ?? "") &&
      (view.criteria.minNights ?? 0) === (criteria.minNights ?? 0) &&
      !!view.criteria.absorbOnly === !!criteria.absorbOnly &&
      !!view.criteria.movedOnly === !!criteria.movedOnly,
  );
}

export function getView(id: string | null | undefined): WorklistView | undefined {
  return WORKLIST_VIEWS.find((v) => v.id === id);
}
