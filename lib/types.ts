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

  /**
   * Set only once a door check-in list has been uploaded for this night.
   *
   * Load-bearing, not bookkeeping: without it there is no way to tell "we
   * have the check-in file and 80 people did not come" from "we have no file
   * for this night". A night with no file must never render as nobody
   * attending — the same trap the discipleship capture-gap fell into.
   */
  attendanceUploadedAt?: string;
  attendanceSourceFilename?: string;
  attendanceCount?: number;
  /**
   * The door check-in sheet this night reads from, when it was imported by
   * link rather than by file. Kept alongside `attendanceSourceFilename`
   * rather than replacing it: together they say which door a night came
   * through, which the season audit will want long after the import.
   */
  attendanceSheetUrl?: string;
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

  /**
   * Registering and turning up are different events, and the gap is large:
   * on 2026-05-30, 183 people registered and 131 checked in — a 56% show-up
   * rate. Everything this app called "attendance" before 2026-08-12 was
   * really registration.
   *
   * `attendedAt` is the door check-in time, kept at full precision because
   * arrival spreads across the evening (5:33pm to 8:28pm on May 30) and that
   * curve is worth charting. **Never timezone-convert it** — the hour as
   * written is the local hour, exactly like the DGroup time fields.
   */
  attendedAt?: string;
  /** Sport from the check-in list, which can differ from the one registered. */
  attendedSport?: string;
  /** False for a walk-in: someone who checked in without registering. */
  registered: boolean;
}

/** One row as parsed off the incoming sheet, before matching. */
export interface IncomingRow {
  rowIndex: number;
  firstName: string;
  lastName: string;
  nickname?: string;
  mobileNumber?: string;
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

/** One check-in, parsed from the door list's "Last, First 🏐" string. */
export interface IncomingAttendanceRow {
  rowIndex: number;
  /** Verbatim cell, kept so a review card can show what was actually typed. */
  raw: string;
  lastName: string;
  firstName: string;
  sport?: string;
  checkedInAt: string;
}
