// Shared DGroup categorization — used by both the dashboard's leader/member
// counts and the player directory's filter. One definition, so the two
// surfaces can never quietly disagree on what "DGroup Leader" means.

import type { Participation, Player } from "./types";

export const DGROUP_LEADER_STATUS = "DGroup Leader";
export const D12_LEADER_STATUS = "D12 (DMembers already leading a DGroup)";

export const LEADER_STATUSES = new Set([DGROUP_LEADER_STATUS, D12_LEADER_STATUS]);

export type DGroupCategory = "DGroup Leader" | "D12" | "DGroup Member" | "Seeking" | "Not involved";

export const DGROUP_CATEGORIES: DGroupCategory[] = [
  "DGroup Leader",
  "D12",
  "DGroup Member",
  "Seeking",
  "Not involved",
];

// "Are you willing to absorb members?" is a free-text form field, not a
// yes/no select — real answers range from a bare "Yes" to a capacity number
// ("2", "5") to a number embedded in a sentence ("Yes, 3-5", "Yes if they
// are residing in upper Antipolo"). Any mention of "yes" or any digit reads
// as an affirmative capacity answer; "No"/"N/A"/"NA" contain neither and are
// correctly excluded.
const WILLING_TO_ABSORB_PATTERN = /yes|\d/i;

export function isWillingToAbsorb(value: string | undefined): boolean {
  return WILLING_TO_ABSORB_PATTERN.test((value ?? "").trim());
}

/**
 * The single categorization rule. Everything else in the app derives from
 * this — a Player's current standing, a Participation's point-in-time
 * standing, the directory filter, the dashboard segments — so the surfaces
 * cannot quietly disagree about what "a leader" means.
 */
export function categoryFromAnswers(
  dgroupStatus: string | undefined,
  dgroupInterestedInJoining: string | undefined,
): DGroupCategory {
  if (dgroupStatus === DGROUP_LEADER_STATUS) return "DGroup Leader";
  if (dgroupStatus === D12_LEADER_STATUS) return "D12";
  if (dgroupStatus === "DGroup Member") return "DGroup Member";
  if (dgroupInterestedInJoining === "Yes") return "Seeking";
  return "Not involved";
}

export function getDGroupCategory(player: Player): DGroupCategory {
  return categoryFromAnswers(player.dgroupStatus, player.dgroupInterestedInJoining);
}

/**
 * The four buckets leadership actually acts on. Coarser than DGroupCategory
 * (D12 and DGroup Leader roll up together) because the follow-up move is the
 * same for both: they are the people with capacity to absorb someone.
 *
 * Ordered as the discipleship pipeline runs, not by size — "Not involved"
 * sits last because it is the far end of the journey, and every chart that
 * renders these keeps that order so the shape reads consistently.
 */
export type DGroupSegment = "Leaders" | "Members" | "Seekers" | "Not involved";

export const DGROUP_SEGMENTS: DGroupSegment[] = ["Leaders", "Members", "Seekers", "Not involved"];

export function segmentFromCategory(category: DGroupCategory): DGroupSegment {
  if (category === "DGroup Leader" || category === "D12") return "Leaders";
  if (category === "DGroup Member") return "Members";
  if (category === "Seeking") return "Seekers";
  return "Not involved";
}

export function getPlayerSegment(player: Player): DGroupSegment {
  return segmentFromCategory(getDGroupCategory(player));
}

export interface ResolvedSegment {
  segment: DGroupSegment;
  /**
   * True when the segment came from the form this person filled in on that
   * night. False when no point-in-time answer was stored and we fell back to
   * their latest known record, which for a past night is an assumption, not
   * a measurement — the UI must say so rather than draw it as fact.
   */
  pointInTime: boolean;
}

export function resolveParticipationSegment(
  participation: Participation,
  player: Player | undefined,
): ResolvedSegment {
  const hasPointInTime =
    (participation.dgroupStatus ?? "") !== "" || (participation.dgroupInterestedInJoining ?? "") !== "";

  if (hasPointInTime) {
    return {
      segment: segmentFromCategory(
        categoryFromAnswers(participation.dgroupStatus, participation.dgroupInterestedInJoining),
      ),
      pointInTime: true,
    };
  }

  return { segment: player ? getPlayerSegment(player) : "Not involved", pointInTime: false };
}

/** Willing-to-absorb for a specific night, falling back to the player record. */
export function resolveWillingToAbsorb(
  participation: Participation,
  player: Player | undefined,
): boolean {
  if ((participation.dgroupLeadingWillingToAbsorb ?? "") !== "") {
    return isWillingToAbsorb(participation.dgroupLeadingWillingToAbsorb);
  }
  return isWillingToAbsorb(player?.dgroupLeadingWillingToAbsorb);
}

// Three tones for five categories, mapped by what an admin actually scans
// for: settled/already-involved (success — a resolved, positive state, per
// DESIGN.md's Success tone definition) vs. Seeking (accent — the one that
// needs a follow-up action, so it earns the attention color) vs. no status.
export function getDGroupCategoryTone(category: DGroupCategory): "success" | "accent" | "neutral" {
  if (category === "Seeking") return "accent";
  if (category === "Not involved") return "neutral";
  return "success";
}
