// Movement: who changed where they stand, and how much to trust it.
//
// Measured on the full season before this was designed: of 1080 players, 847
// answered the discipleship question at least once, 191 answered on two or
// more nights, and only 36 ever changed their answer. Movement is a rare
// event, so the job of this module is to find those few and be honest about
// which of them are real.
//
// Two reasons a recorded change may not be real movement, both measured:
//
// 1. `D12 (DMembers already leading a DGroup)` and `DGroup Member` overlap in
//    the form's own wording — the D12 label contains the word "DMembers", so
//    one person can reasonably pick either on different nights. 9 of the
//    season's transitions are this pair.
// 2. A sequence that returns to a standing it already held is reporting
//    noise, not a journey. 3 of the 36 changers do this.
//
// A change between `DGroup Leader` and `D12` is not movement at all — both
// are Leaders — so it never reaches this module's output.

import { DGROUP_SEGMENTS, categoryFromAnswers, segmentFromCategory } from "./dgroup";
import type { DGroupCategory, DGroupSegment } from "./dgroup";
import type { GameNight, Participation } from "./types";

export interface StandingPoint {
  gameNightId: string;
  date: string;
  category: DGroupCategory;
  segment: DGroupSegment;
}

export interface StandingChange {
  from: StandingPoint;
  to: StandingPoint;
  /** Toward deeper involvement, per the pipeline order in DGROUP_SEGMENTS. */
  direction: "forward" | "backward";
  /** The D12 / DGroup Member pair — see this file's header. */
  ambiguousWording: boolean;
}

export interface PlayerMovement {
  playerId: string;
  /** Only nights this person actually answered on. */
  points: StandingPoint[];
  changes: StandingChange[];
  /** They returned to a standing they had already held. */
  roundTrip: boolean;
}

export interface MovementSummary {
  from: DGroupSegment;
  to: DGroupSegment;
  direction: "forward" | "backward";
  changeCount: number;
  /** A round trip, or any leg resting on the ambiguous wording pair. */
  uncertain: boolean;
}

const AMBIGUOUS_PAIR = new Set(["D12|DGroup Member", "DGroup Member|D12"]);

function isAmbiguous(from: DGroupCategory, to: DGroupCategory): boolean {
  return AMBIGUOUS_PAIR.has(`${from}|${to}`);
}

/** Lower index is deeper involvement, so a smaller index is forward. */
function directionOf(from: DGroupSegment, to: DGroupSegment): "forward" | "backward" {
  return DGROUP_SEGMENTS.indexOf(to) < DGROUP_SEGMENTS.indexOf(from) ? "forward" : "backward";
}

export function buildMovements(
  participations: Participation[],
  gameNights: GameNight[],
): Map<string, PlayerMovement> {
  const dateByNight = new Map(gameNights.map((gn) => [gn.gameNightId, gn.gameNightDate]));

  const pointsByPlayer = new Map<string, StandingPoint[]>();
  for (const p of participations) {
    const answered = (p.dgroupStatus ?? "") !== "" || (p.dgroupInterestedInJoining ?? "") !== "";
    if (!answered) continue;
    const date = dateByNight.get(p.gameNightId);
    if (!date) continue;

    const category = categoryFromAnswers(p.dgroupStatus, p.dgroupInterestedInJoining);
    const list = pointsByPlayer.get(p.playerId) ?? [];
    list.push({ gameNightId: p.gameNightId, date, category, segment: segmentFromCategory(category) });
    pointsByPlayer.set(p.playerId, list);
  }

  const out = new Map<string, PlayerMovement>();
  for (const [playerId, unsorted] of pointsByPlayer) {
    const points = [...unsorted].sort((a, b) => a.date.localeCompare(b.date));

    const changes: StandingChange[] = [];
    const seen = new Set<DGroupSegment>();
    let roundTrip = false;
    let previous: StandingPoint | undefined;

    for (const point of points) {
      if (previous && point.segment !== previous.segment) {
        if (seen.has(point.segment)) roundTrip = true;
        changes.push({
          from: previous,
          to: point,
          direction: directionOf(previous.segment, point.segment),
          ambiguousWording: isAmbiguous(previous.category, point.category),
        });
      }
      seen.add(point.segment);
      previous = point;
    }

    out.set(playerId, { playerId, points, changes, roundTrip });
  }
  return out;
}

/** Net first-to-latest standing, or undefined when nothing ever changed. */
export function summarize(movement: PlayerMovement | undefined): MovementSummary | undefined {
  if (!movement || movement.changes.length === 0) return undefined;
  const from = movement.points[0];
  const to = movement.points[movement.points.length - 1];

  return {
    from: from.segment,
    to: to.segment,
    // Ending where they started is only reachable via a round trip, which is
    // exactly the case we do not want reported as a direction.
    direction: directionOf(from.segment, to.segment),
    changeCount: movement.changes.length,
    uncertain: movement.roundTrip || movement.changes.some((c) => c.ambiguousWording),
  };
}

export interface MovementTotals {
  movers: number;
  intoLeadership: number;
  intoSeeking: number;
  forward: number;
  backward: number;
  uncertain: number;
}

export function movementTotals(movements: Map<string, PlayerMovement>): MovementTotals {
  const totals: MovementTotals = {
    movers: 0,
    intoLeadership: 0,
    intoSeeking: 0,
    forward: 0,
    backward: 0,
    uncertain: 0,
  };

  for (const movement of movements.values()) {
    const summary = summarize(movement);
    if (!summary) continue;
    totals.movers += 1;
    if (summary.uncertain) totals.uncertain += 1;
    else if (summary.direction === "forward") totals.forward += 1;
    else totals.backward += 1;

    // Counted on the confident set only — an ambiguous D12/Member flip must
    // not inflate "stepped into leadership", which is the headline number.
    if (!summary.uncertain && summary.to === "Leaders") totals.intoLeadership += 1;
    if (!summary.uncertain && summary.to === "Seekers" && summary.from === "Not involved") {
      totals.intoSeeking += 1;
    }
  }
  return totals;
}
