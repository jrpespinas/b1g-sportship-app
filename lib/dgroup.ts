// Shared DGroup categorization — used by both the dashboard's leader/member
// counts and the player directory's filter. One definition, so the two
// surfaces can never quietly disagree on what "DGroup Leader" means.

import type { Participation, Player } from "./types";

export const DGROUP_LEADER_STATUS = "DGroup Leader";
export const D12_LEADER_STATUS = "D12 (DMembers already leading a DGroup)";

export const LEADER_STATUSES = new Set([DGROUP_LEADER_STATUS, D12_LEADER_STATUS]);

export type DGroupCategory =
  | "DGroup Leader"
  | "D12"
  | "DGroup Member"
  | "Seeking"
  | "Not involved"
  | "Not recorded";

export const DGROUP_CATEGORIES: DGroupCategory[] = [
  "DGroup Leader",
  "D12",
  "DGroup Member",
  "Seeking",
  "Not involved",
  "Not recorded",
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
 * "No, but I am seeking for a group" — the seeking answer to the *membership*
 * question. A second, older way of raising the same hand.
 */
const SEEKING_MEMBER_STATUS = /seeking/i;

/**
 * The single categorization rule. Everything else in the app derives from
 * this — a Player's current standing, a Participation's point-in-time
 * standing, the directory filter, the dashboard segments, the match board —
 * so the surfaces cannot quietly disagree about what "a leader" means.
 *
 * **Two fields carry "I want a group", because the form asked twice.**
 * Corrected 2026-08-14. `dgroup_interested_in_joining` ("Are you interested in
 * joining a Discipleship Group") is the current question; the older
 * `dgroup_member_status` offers "No, but I am seeking for a group". Reading
 * only the first found 40 seekers. Reading both finds **86** — and 86 is
 * independently confirmed by the form itself: exactly 86 people were branched
 * into the "Type of Discipleship Group you plan to join" block, which the form
 * only shows to someone who has said they are looking. 84 of them stated
 * preferences that the match board can score.
 *
 * The 46 this used to miss were filed as "Not involved" — the bucket the
 * dashboard describes as "have not been asked" — while they had asked, in
 * writing, and named the group they wanted.
 *
 * **"Not recorded" is not "Not involved".** Someone with no discipleship
 * answer of any kind has never been asked; someone who answered "No" has been
 * asked and declined. The follow-up is different, so the bucket is different,
 * and folding the two together overstated "not involved" by 72 people while
 * hiding the ministry's real coverage gap.
 *
 * Status wins over both hand-raising fields: a DGroup Member who also ticked
 * "seeking" is already placed, whatever else they ticked.
 */
export function categoryFromAnswers(
  dgroupStatus: string | undefined,
  dgroupInterestedInJoining: string | undefined,
  dgroupMemberStatus?: string | undefined,
): DGroupCategory {
  if (dgroupStatus === DGROUP_LEADER_STATUS) return "DGroup Leader";
  if (dgroupStatus === D12_LEADER_STATUS) return "D12";
  if (dgroupStatus === "DGroup Member") return "DGroup Member";

  const interested = (dgroupInterestedInJoining ?? "").trim();
  const membership = (dgroupMemberStatus ?? "").trim();

  if (interested === "Yes" || SEEKING_MEMBER_STATUS.test(membership)) return "Seeking";
  // Answered something about discipleship, just not one of the above: "No",
  // "Cannot decide. I will pray about it", or a membership answer.
  if (interested !== "" || membership !== "") return "Not involved";
  return "Not recorded";
}

export function getDGroupCategory(player: Player): DGroupCategory {
  return categoryFromAnswers(
    player.dgroupStatus,
    player.dgroupInterestedInJoining,
    player.dgroupMemberStatus,
  );
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
export type DGroupSegment = "Leaders" | "Members" | "Seekers" | "Not involved" | "Not recorded";

export const DGROUP_SEGMENTS: DGroupSegment[] = [
  "Leaders",
  "Members",
  "Seekers",
  "Not involved",
  "Not recorded",
];

export function segmentFromCategory(category: DGroupCategory): DGroupSegment {
  if (category === "DGroup Leader" || category === "D12") return "Leaders";
  if (category === "DGroup Member") return "Members";
  if (category === "Seeking") return "Seekers";
  if (category === "Not recorded") return "Not recorded";
  return "Not involved";
}

export function getPlayerSegment(player: Player): DGroupSegment {
  return segmentFromCategory(getDGroupCategory(player));
}

/**
 * In no discipleship group, however they got there — seeking, declined, or
 * never asked. One definition, because six call sites were each spelling out
 * their own two-thirds of it and none of them counted the never-asked.
 */
export function isUnplaced(segment: DGroupSegment): boolean {
  return segment === "Seekers" || segment === "Not involved" || segment === "Not recorded";
}

/**
 * Badge tone follows what the row asks someone to DO, not how "good" it is.
 * Accent marks the rows worth acting on: a regular attender in no group is
 * the warmest conversation on any of these screens. Leaders and members are
 * already placed, so they stay quiet.
 */
export function getSegmentTone(segment: DGroupSegment): "success" | "accent" | "neutral" {
  if (segment === "Seekers" || segment === "Not involved") return "accent";
  if (segment === "Leaders" || segment === "Members") return "success";
  // "Not recorded" is the absence of an answer, not a standing worth acting
  // on directly — it asks someone to go and ask, which is a different move.
  return "neutral";
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
        // A Participation carries no membership answer — that question is only
        // asked of the player record — so the older seeking signal cannot
        // reach this path. It does not need to: any row with a point-in-time
        // answer came from the newer form, which asks `interested` directly.
        categoryFromAnswers(participation.dgroupStatus, participation.dgroupInterestedInJoining),
      ),
      pointInTime: true,
    };
  }

  // No answer on the night and no player to fall back to means nobody ever
  // recorded where this person stands — which is its own bucket, not "Not
  // involved". Claiming the latter would invent a declined invitation.
  return { segment: player ? getPlayerSegment(player) : "Not recorded", pointInTime: false };
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
