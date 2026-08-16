"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  roleForPassword,
  safeNextPath,
} from "@/lib/auth";

export interface SignInState {
  error?: string;
}

/**
 * Attempts on this instance, keyed by client IP.
 *
 * **This is a floor, not a rate limiter.** Serverless instances do not share
 * memory, so an attacker who spreads requests across instances sidesteps it
 * entirely; it only slows the naive case. The real defence is the length of
 * the passphrase — twenty random characters make online guessing irrelevant,
 * which is why the hashing script refuses anything shorter than sixteen.
 *
 * A shared counter needs an external store (Upstash's free tier is the usual
 * answer) and is the first thing to add if this app ever gets attention.
 */
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (rateLimited(ip)) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  const role = roleForPassword(password);
  if (!role) {
    // One message for every failure. Naming the role, or saying whether a
    // password "exists", hands an attacker a free bit of information.
    return { error: "That password was not recognised." };
  }

  const token = createSessionToken(role);
  if (!token) {
    return { error: "Sign-in is not configured on this deployment. AUTH_SESSION_SECRET is missing." };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect(next);
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
