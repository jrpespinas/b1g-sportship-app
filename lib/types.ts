// Mirrors docs/spec/01-data-model.md. This build pass surfaces a subset of
// Players fields in the UI (identity + DGroup status + sport); the rest of
// the form's columns are still captured in `raw` so no data is dropped, per
// the spec's "field-count reduction, deliberately not done" principle.

export type Sport =
  | "Basketball"
  | "Badminton"
  | "Volleyball"
  | "Pickleball"
  | "Running";

export type DGroupMemberStatus =
  | "Yes"
  | "No"
  | "No, but I am seeking for a group";

export type DGroupStatus =
  | "DGroup Leader"
  | "D12 (DMembers already leading a DGroup)"
  | "DGroup Member";

export type DGroupInterest = "Yes" | "No" | "Cannot decide. I will pray about it";

export interface Player {
  playerId: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  email: string;
  mobileNumber?: string;
  gender?: string;
  civilStatus?: string;
  dgroupMemberStatus?: DGroupMemberStatus;
  dgroupStatus?: DGroupStatus;
  dgroupInterestedInJoining?: DGroupInterest;
  dgroupLeadingWillingToAbsorb?: string;
  churchAffiliation?: string;
  firstSeenGameNightId: string;
  firstSeenAt: string;
  lastUpdatedAt: string;
  /** Every other mapped column from the form, kept verbatim. */
  raw: Record<string, string>;
}

export interface GameNight {
  gameNightId: string;
  gameNightDate: string;
  uploadedAt: string;
  uploadedBy: string;
  sourceFilename: string;
  rowCount: number;
  autoConfirmedCount: number;
  flaggedCount: number;
  resolvedLinkExistingCount: number;
  resolvedAddNewCount: number;
  resolvedSkipCount: number;
}

export interface Participation {
  participationId: string;
  playerId: string;
  gameNightId: string;
  sportSelected: Sport | string;
  skillLevel?: string;
  isFirstParticipation: boolean;
  submittedAt: string;

  /**
   * Discipleship status as answered on THIS night's form — the point-in-time
   * record. The Player row only ever holds the latest answer, so without
   * these a "DGroup composition over time" chart can only paint today's
   * status backwards onto every past night, which invents a trend.
   *
   * Undefined on rows written before this was captured (2026-08-11). Callers
   * must fall back explicitly and say so in the UI — see
   * `resolveParticipationSegment` in lib/dgroup.ts.
   */
  dgroupStatus?: DGroupStatus;
  dgroupInterestedInJoining?: DGroupInterest;
  dgroupLeadingWillingToAbsorb?: string;
}

/** One row as parsed off the incoming sheet, before matching. */
export interface IncomingRow {
  rowIndex: number;
  firstName: string;
  lastName: string;
  email: string;
  gender?: string;
  civilStatus?: string;
  dgroupMemberStatus?: DGroupMemberStatus;
  dgroupStatus?: DGroupStatus;
  dgroupInterestedInJoining?: DGroupInterest;
  dgroupLeadingWillingToAbsorb?: string;
  churchAffiliation?: string;
  sportSelected: Sport | string;
  skillLevel?: string;
  firstTimeSelfReported?: string;
  submittedAt: string;
  raw: Record<string, string>;
}

export type MatchOutcome =
  | { kind: "new"; row: IncomingRow }
  | { kind: "returning"; row: IncomingRow; player: Player }
  | { kind: "ambiguous"; row: IncomingRow; candidates: Player[] };

export type ReviewAction =
  | { kind: "linkExisting"; playerId: string }
  | { kind: "addNew" }
  | { kind: "skip" };
