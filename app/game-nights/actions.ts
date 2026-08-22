"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";
import { readAttendanceLink, parseSheetUrl } from "@/lib/attendance-link";
import { setAttendanceSheetUrl } from "@/lib/store";

async function assertAdmin(): Promise<void> {
  const role = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (role !== "admin") throw new Error("Not authorised: attaching a sheet requires the admin password.");
}

export interface SheetStatus {
  ok: boolean;
  /** Check-ins the sheet holds for this night right now. */
  count?: number;
  tabTitle?: string;
  /** Local `HH:MM` the count was read, so a stale number cannot pass as live. */
  asOf?: string;
  error?: string;
}

function explain(reason: string): string {
  switch (reason) {
    case "bad-url":
      return "That doesn't look like a Google Sheets link. Copy the URL from the sheet's address bar.";
    case "not-shared":
      return "The app cannot open that sheet. Share it with the service account as a Viewer.";
    case "not-found":
      return "No sheet at that link.";
    case "no-such-tab":
      return "That link points at a tab that no longer exists.";
    case "wrong-shape":
      return `That sheet has no "Attendance" column — it is not a check-in list.`;
    default:
      return "Could not read that sheet.";
  }
}

/** Read as written — the same rule that keeps a 5:33pm arrival out of 1:33am. */
const nowLocal = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * Attaches a link to a night and reads it once, so a sheet that is unreachable
 * or the wrong shape fails on the Tuesday you paste it rather than at 7pm on
 * the Friday you are relying on it.
 */
export async function attachSheet(
  gameNightId: string,
  gameNightDate: string,
  url: string,
): Promise<SheetStatus> {
  await assertAdmin();

  const trimmed = url.trim();
  if (!trimmed) {
    await setAttendanceSheetUrl(gameNightId, "");
    revalidatePath(`/game-nights/${gameNightId}`);
    return { ok: true, count: 0, asOf: nowLocal() };
  }
  if (!parseSheetUrl(trimmed)) return { ok: false, error: explain("bad-url") };

  const read = await readAttendanceLink(trimmed, gameNightDate);
  if (!read.ok) return { ok: false, error: explain(read.reason) };

  await setAttendanceSheetUrl(gameNightId, trimmed);
  revalidatePath(`/game-nights/${gameNightId}`);
  return { ok: true, count: read.matchedDate, tabTitle: read.tabTitle, asOf: nowLocal() };
}

/**
 * Re-reads an attached sheet without writing anything.
 *
 * This is the live view: the count moves as people arrive, and nothing is
 * committed until the night is over. Viewer-readable — watching the door fill
 * is not a write.
 */
export async function readSheetNow(gameNightDate: string, url: string): Promise<SheetStatus> {
  const role = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!role) throw new Error("Not authorised.");

  const read = await readAttendanceLink(url, gameNightDate);
  if (!read.ok) return { ok: false, error: explain(read.reason) };
  return { ok: true, count: read.matchedDate, tabTitle: read.tabTitle, asOf: nowLocal() };
}
