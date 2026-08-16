"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartColumn, HeartHandshake, Upload, Users, type LucideIcon } from "lucide-react";
import { clsx } from "@/lib/clsx";

// Shows every destination on every page. Access control is deferred (no
// credential check exists anywhere yet — docs/spec/04-access-control.md),
// so a role-split nav would draw a boundary that doesn't actually exist:
// hiding links doesn't gate anything when the routes themselves are open to
// anyone with the URL. Revisit this list, not the concept, once real access
// control ships and a role-aware split is worth something again.
//
// Icons pair with labels down to `sm`. Below that a fifth destination made
// them stop fitting — four pairs already need ~322px of the 342px a 390px
// viewport leaves — so the labels give way and the icons carry it alone.
//
// That has a consequence the rest of the system does not: with no text,
// weight has nothing to act on, so the active state cannot be carried by
// font-weight the way it is everywhere else. Below `sm` only, the active
// destination takes an `accent-tint` fill — borrowed from the view chips
// rather than invented, and scoped to the one place labels are absent.
const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/players", label: "Players", icon: Users },
  { href: "/match", label: "Match", icon: HeartHandshake },
  { href: "/game-nights", label: "Nights", icon: CalendarDays },
  { href: "/dashboard", label: "Dashboard", icon: ChartColumn },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-surface">
      {/*
        1280 matches Dashboard, Players, and Match — the surfaces this bar sits
        above most often — so the mark lines up with the content beneath it.
        Upload (640) and the player detail (880) are deliberately narrower
        reading columns; chrome spanning wider than a reading column is normal.
      */}
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between px-6 max-sm:justify-center">
        {/*
          Hidden below sm. Wayfinding is this bar's job and identity is not,
          so the mark is the first thing to give way when space runs out. With
          a fifth destination the labels follow it — see the note above.
        */}
        <Link
          href="/dashboard"
          className="hidden items-center rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11 sm:flex"
        >
          {/*
            Cropped from the client's full lockup (ssc logo.png) — B1G
            Sportship mark only, "Singles' Sports Community" script half
            dropped: illegible at this scale, and its warm/community register
            is exactly what this chrome's neutral-utility register stays
            separate from (DESIGN.md → Components → Navigation).
          */}
          <Image
            src="/b1g-sportship-mark.png"
            alt="B1G Sportship"
            width={228}
            height={66}
            className="h-6 w-auto"
            priority
          />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-5">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                // The label is the accessible name at sm and up; below that it
                // is gone from the DOM, so the link needs its own.
                aria-label={link.label}
                className={clsx(
                  "inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent pointer-coarse:min-h-11 pointer-coarse:min-w-11 sm:rounded-[4px] sm:px-0 sm:py-0 sm:pointer-coarse:min-w-0 sm:pointer-coarse:px-2",
                  active
                    ? "font-semibold text-ink max-sm:bg-accent-tint max-sm:text-accent-ink"
                    : "font-medium text-ink-secondary hover:text-ink",
                )}
              >
                {/* currentColor, so the icon changes ink with its label as one
                    unit rather than carrying a state rule of its own. */}
                <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                <span className="max-sm:hidden">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
