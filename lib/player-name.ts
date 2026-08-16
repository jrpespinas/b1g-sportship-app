// One definition of how a person's name is written and searched, so the
// directory, the detail page, the dashboard leaderboard, and the upload
// review queue can never drift apart on it.
//
// Directory form — "Last, First (Nickname)" — puts the sort key first, so an
// alphabetised list scans down its own ordering. It also matches what
// `lib/fuzzy.ts` already normalises to internally for dedup.

export interface NameParts {
  firstName: string;
  lastName: string;
  nickname?: string;
  email?: string;
}

/**
 * Nickname is shown only when it says something the first name doesn't.
 * 231 of 1081 people on the current roster gave a nickname identical to
 * their first name, and "Sandoval, Carl (Carl)" is noise on a fifth of the
 * list.
 */
function usableNickname(parts: NameParts): string {
  const nickname = parts.nickname?.trim() ?? "";
  const first = parts.firstName?.trim() ?? "";
  if (!nickname) return "";
  return nickname.toLowerCase() === first.toLowerCase() ? "" : nickname;
}

export function formatName(parts: NameParts): string {
  const first = parts.firstName?.trim() ?? "";
  const last = parts.lastName?.trim() ?? "";
  const nickname = usableNickname(parts);

  // A missing half must not render a stray comma — one roster row has no last
  // name and one has no first name. With both missing, the nickname carries
  // the row on its own: "Ed sul" is someone a person can recognise, where
  // "Unnamed player (Ed sul)" reads as a bug report.
  if (!first && !last) return nickname || parts.nickname?.trim() || "Unnamed player";

  const base = last && first ? `${last}, ${first}` : last || first;
  return nickname ? `${base} (${nickname})` : base;
}

/**
 * Natural order, for contexts that compare two people rather than list many:
 * the upload review queue sets names side by side and highlights the word
 * that differs, and "Last, First" would fight that reading. Lists use
 * `formatName`; comparisons use this.
 */
export function formatNameNatural(parts: NameParts): string {
  const name = `${parts.firstName ?? ""} ${parts.lastName ?? ""}`.trim();
  return name || "Unnamed player";
}

/** The nickname worth showing, or "" when it only repeats the first name. */
export function displayNickname(parts: NameParts): string {
  return usableNickname(parts);
}

/** Sort key for the directory: surname first, given name as the tiebreak. */
export function sortableName(parts: NameParts): string {
  const key = `${parts.lastName?.trim() ?? ""} ${parts.firstName?.trim() ?? ""}`.trim();
  // Falling back to the nickname files a nameless row under a letter someone
  // would actually look under, instead of sorting it above the whole alphabet.
  return (key || parts.nickname?.trim() || "").toLowerCase();
}

/**
 * Matches either name order, the nickname, and the email. Nickname matters
 * most: people here are known by it — "Patz", not "Patrick Christian" — so a
 * search that skipped it would fail the most natural query anyone types.
 */
export function nameMatchesQuery(parts: NameParts, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    `${parts.firstName} ${parts.lastName}`,
    `${parts.lastName}, ${parts.firstName}`,
    parts.nickname ?? "",
    parts.email ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
