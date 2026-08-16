// The gate in front of 1,129 people's names, emails and phone numbers.
//
// Two shared credentials, no user table — the design docs/spec/04-access-control.md
// has always described, built once deployment turned "every route is open" from
// a deferral into a live disclosure.
//
// The split is read versus write, not dashboard versus directory: a viewer
// reads every surface including contact details, because the pastor's whole
// job is handing a name to a leader. Only the write paths — upload and dedup
// review — need the admin credential, because overwriting the roster is the
// action nobody should take by accident.

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type Role = "viewer" | "admin";

export const SESSION_COOKIE = "b1g_session";

/** 30 days. The pastor opens this quarterly; a short session guarantees he
 *  meets a password he has forgotten every single visit, and that pressure is
 *  what puts credentials on a whiteboard. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Bumping this in the environment invalidates every live session.
 *
 * Without it, rotating a leaked password would leave everyone who already had
 * it signed in for up to another thirty days — which is the opposite of what
 * rotating a password is for.
 */
const CREDENTIAL_VERSION = process.env.AUTH_CREDENTIAL_VERSION ?? "1";

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 } as const;

/**
 * `scrypt:<salt-hex>:<hash-hex>`.
 *
 * Self-describing so a stored hash can be read without guessing parameters,
 * and so a future change of algorithm is detectable rather than silent.
 *
 * **Colons, not `$`.** The obvious separator is the one PHC strings use, and
 * it silently destroys the value: dotenv expands `$name` as a variable
 * reference, so `scrypt$salt$hash` reaches the app as the literal string
 * `"scrypt"` and every correct password is rejected as wrong. Verified with
 * `@next/env` — 6 characters arrived where 104 were written.
 */
export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  const key = scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, SCRYPT);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

/**
 * Constant-time, and never short-circuits on a malformed stored value: a
 * missing environment variable must cost the same time as a wrong password,
 * or the response time tells an attacker which gate is unconfigured.
 */
export function verifyPassword(password: string, stored: string | undefined): boolean {
  const parts = (stored ?? "").split(":");
  const salt = parts[1] ?? "";
  const expected = parts[2] ?? "";
  // A fixed-length dummy so the comparison below always runs on equal buffers.
  const expectedBuf = Buffer.from(expected.padEnd(SCRYPT.keylen * 2, "0").slice(0, SCRYPT.keylen * 2), "hex");
  const actual = scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, SCRYPT);
  const match = timingSafeEqual(actual, expectedBuf);
  return match && parts[0] === "scrypt" && expected.length === SCRYPT.keylen * 2;
}

interface SessionPayload {
  role: Role;
  /** Seconds since epoch. Inside the signature, not only in the cookie. */
  exp: number;
  ver: string;
  /** Random per session, so two sessions of the same role are distinguishable. */
  jti: string;
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64url");

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function sessionSecret(): string | undefined {
  const secret = process.env.AUTH_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : undefined;
}

/** A signed, self-contained session token. No server-side session store, which
 *  keeps the app's only stateful dependency the Google Sheet. */
export function createSessionToken(role: Role): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload: SessionPayload = {
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    ver: CREDENTIAL_VERSION,
    jti: randomBytes(9).toString("base64url"),
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

/**
 * Returns the role a token proves, or null.
 *
 * The expiry is checked from the *signed* payload rather than trusting the
 * cookie's Max-Age: a cookie whose lifetime only the browser enforces can be
 * replayed forever by anyone who copies it once.
 */
export function readSessionToken(token: string | undefined): Role | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (payload.ver !== CREDENTIAL_VERSION) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload.role === "admin" || payload.role === "viewer" ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * Which credential a password matches, or null.
 *
 * **Both hashes are always evaluated.** Returning early on an admin match
 * would make an admin password measurably faster than a viewer one, which
 * tells an attacker which of the two they have found.
 */
export function roleForPassword(password: string): Role | null {
  const isAdmin = verifyPassword(password, process.env.AUTH_ADMIN_HASH);
  const isViewer = verifyPassword(password, process.env.AUTH_VIEWER_HASH);
  if (isAdmin) return "admin";
  if (isViewer) return "viewer";
  return null;
}

/** Routes only the admin credential opens — the write paths. Everything else
 *  is readable by any signed-in session. */
export function requiresAdmin(pathname: string): boolean {
  return pathname === "/upload" || pathname.startsWith("/upload/");
}

/**
 * A redirect target is only honoured when it is a path on this site.
 *
 * `?next=https://evil.example` would otherwise turn the login screen into an
 * open redirect — a phishing primitive that borrows this app's domain.
 */
export function safeNextPath(next: string | undefined | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}
