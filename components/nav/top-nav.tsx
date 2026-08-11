"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";

// Shows every destination on every page. Access control is deferred (no
// credential check exists anywhere yet — docs/spec/04-access-control.md),
// so a role-split nav would draw a boundary that doesn't actually exist:
// hiding links doesn't gate anything when the routes themselves are open to
// anyone with the URL. Revisit this list, not the concept, once real access
// control ships and a role-aware split is worth something again.
const LINKS = [
  { href: "/upload", label: "Upload" },
  { href: "/players", label: "Players" },
  { href: "/dashboard", label: "Dashboard" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 w-full max-w-[960px] items-center justify-between px-6">
        <Link href="/upload" className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[4px]">
          {/*
            Cropped from the client's full lockup (ssc logo.png) — B1G
            Sportship mark only, "Singles' Sports Community" script half
            dropped: illegible at this scale, and its warm/community register
            is exactly what this chrome's neutral-utility register stays
            separate from (DESIGN.md → Components → Navigation).
          */}
          <Image src="/b1g-sportship-mark.png" alt="B1G Sportship" width={228} height={66} className="h-6 w-auto" priority />
        </Link>
        <nav className="flex items-center gap-5">
          {LINKS.map((link) => {
            const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[4px]",
                  active ? "font-semibold text-ink" : "font-medium text-ink-secondary hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
