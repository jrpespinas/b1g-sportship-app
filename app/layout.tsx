import type { Metadata } from "next";
import { cookies } from "next/headers";
import { TopNav } from "@/components/nav/top-nav";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "B1G Sportship",
  description: "Discipleship and attendance for B1G Sportship game nights.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The nav needs the role to decide whether Upload is reachable. Read here
  // rather than in the nav itself, which is a client component.
  const role = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <div
          suppressHydrationWarning
          style={{ display: "none" }}
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: Auto-resolve the obvious, ask only about real ambiguity — the review
queue's smallness is proof of working match logic, not a rubber-stamp step;
refuses the generic "review everything in a bulk table" default.
OWN-WORLD: White/clean ground, #FF6F2F accent reserved for fills + badges
paired with dark ink text (never small text itself — fails contrast at that
hue), system font stack, 2xl-rounded cards with soft offset shadows, tabular
figures for counts.
STORY: Admin drops a file, trusts known/new players to resolve silently,
triages only genuine lookalikes one at a time, leaves with a confirmed
card-based batch summary.
FIRST VIEWPORT: Left-aligned title + subtitle over a dashed dropzone card,
date + name fields below, full-width primary button — no hero, task first.
FORM: Canon (Apple Health + Linear + Notion, fused) — user-pinned convention,
standing-exit path taken per brief ("apple-like premium"); no concept-seed roll.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md.

REVISION (nav): the original "no persistent chrome" Don't was calibrated for
a single isolated surface and stopped holding once a 4-page product existed
with no way to move between pages. Added a single thin top bar
(components/nav/top-nav.tsx) — B1G Sportship mark + the same three links
(Upload, Players, Dashboard) on every page. DESIGN.md's Layout and
Do's/Don'ts sections carry the revised rule; this is the one exception to
"no chrome" the system now permits, not a reopened door to more of it.

REVISION (access control, 2026-08-08): deferred by explicit product decision
— docs/spec/04-access-control.md is kept as the intended design, not built.
Every route is open to anyone with the URL. The nav's link set was
simplified from an earlier role-aware split (route stood in for role, no
login existed) to showing all three links everywhere, since hiding a link
never gated anything once the page behind it had no lock either.
-->`,
          }}
        />
        {/* First tab stop on every page. Visually absent until focused,
            because the people who need it are the people who will find it by
            tabbing. Without it a keyboard user crosses the whole top bar on
            every navigation, and a screen-reader user had no landmark at all
            to jump into. */}
        <a
          href="#main"
          className="sr-only rounded-[5px] bg-surface px-4 py-2 text-[13px] font-medium text-ink outline-none focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-3 focus-visible:z-50 focus-visible:ring-2 focus-visible:ring-accent"
        >
          Skip to content
        </a>
        <TopNav role={role} />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
      </body>
    </html>
  );
}
