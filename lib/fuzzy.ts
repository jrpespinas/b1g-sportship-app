export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeName(firstName: string, lastName: string): string {
  return `${lastName}, ${firstName}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z, ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The surname alone, folded the same way `normalizeName` folds a full name.
 *
 * Used as a guard on the mobile-number rule: three of the nine shared numbers
 * in the roster belong to couples and friends passing one phone around, and
 * every one of those pairs has a different surname.
 */
export function normalizeSurname(lastName: string): string {
  return lastName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance, small-string implementation (names only). */
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** 0..1, 1 = identical. Conservative on purpose — see docs/spec/02-player-inventory.md. */
export function nameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshtein(a, b);
  return 1 - distance / maxLen;
}

export const FUZZY_MATCH_THRESHOLD = 0.86;
