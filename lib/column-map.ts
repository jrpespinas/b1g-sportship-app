// Source column headers → internal fields, per docs/spec/01-data-model.md.
// Kept as the single place that knows the raw Google Forms header text, so a
// future form-wording change touches one file.

export const REQUIRED_COLUMNS = ["First Name", "Last Name"] as const;
export const REQUIRED_EMAIL_COLUMNS = ["Email Address", "Email Address 2"] as const;

export const COLUMN_MAP = {
  firstName: "First Name",
  lastName: "Last Name",
  // Nickname and mobile number both have Players columns and both were
  // missing here until 2026-08-12, so every historical row carries them in
  // `raw` instead — see the read-through fallback in lib/store.ts.
  nickname: "Nickname",
  mobileNumber: "Mobile Number",
  email: "Email Address",
  emailSecondary: "Email Address 2",
  gender: "Gender",
  civilStatus: "Civil Status",
  dgroupMemberStatus: "Are you part of a Discipleship Group?",
  dgroupStatus: "Your DGroup Status?",
  dgroupInterestedInJoining: "Are you interested in joining a Discipleship Group",
  dgroupLeadingWillingToAbsorb: "Are you willing to absorb members?",
  churchAffiliation: "Which church are you attending?",
  sportSelected: "Select the sport you wish to play",
  firstTimeSelfReported: "Is this your first time registering in B1G Sportship 2026?",
  timestamp: "Timestamp",
} as const;

const SKILL_COLUMNS: Record<string, string> = {
  Badminton: "How would you describe your level of play 🏸",
  Pickleball: "How would you describe your level of play? 🥒",
  Volleyball: "How would you describe your level of play? 🏐",
};

export function normalizeSport(raw: string): string {
  return raw.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
}

export function skillColumnFor(sportSelectedRaw: string): string | undefined {
  const sport = normalizeSport(sportSelectedRaw);
  return SKILL_COLUMNS[sport];
}

/** Every column this app understands — used to decide what stays in `raw`. */
export const KNOWN_COLUMNS = new Set<string>([
  ...Object.values(COLUMN_MAP),
  ...Object.values(SKILL_COLUMNS),
]);
