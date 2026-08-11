---
version: 1
slug: "player-directory"
primary_target: "player-directory"
related_targets: []
---

## Job and audience

Admin, looking someone up — either mid-conversation ("does this person have a DGroup yet?") or doing ministry follow-up ("who's seeking a DGroup and hasn't been contacted?"). Same admin-only audience as the upload surface; this is Player Inventory Features 5–6, not a new role. Device not fixed.

## Outcome and proof

Primary job: find one person fast, then see everything real about them — identity, DGroup involvement, and their actual game-night history (not just a count). Success is a lookup that takes seconds, not a data-exploration session. Proof this isn't generic CRUD: the detail page's participation history is the same underlying data the dashboard's leaderboard aggregates — this is where an admin goes to see the story behind one row of that leaderboard.

## Selected direction

**Visual world: inherited, unchanged.** DESIGN.md governs, no new tokens.

**Structure: precisely specified by the user, no concept roll run.** Two dedicated pages — `/players` (search + filter list) and `/players/[id]` (detail) — reached by ordinary navigation, no modal, no slide-over, no split panel. This was a deliberate choice to extend the established single-column/no-modal pattern rather than open a new composition question; DESIGN.md's own Do's and Don'ts already rule out a modal for something that needs neither interruption nor protected focus, and a split-panel list+detail would reopen the same single-column tension the dashboard's width already went through once — not worth reopening for a feature this size.

**Filter correction found while drafting this brief:** the justification for building a DGroup filter at all was "show me everyone seeking a DGroup" — but that's `dgroup_interested_in_joining`, a different field from `dgroup_status` (Leader/D12/Member). A filter that only covered `dgroup_status` couldn't answer the question that justified building it. Fixed: the DGroup filter's options are a derived category, not a raw field passthrough — `DGroup Leader`, `D12`, `DGroup Member`, `Seeking` (`dgroup_interested_in_joining = Yes` and no status), `Not involved` (everyone else). Church affiliation filter is a raw passthrough of `church_affiliation` — no such ambiguity there.

## Scope and boundaries

In scope: `/players` list (search by name/email, filter by DGroup category + church affiliation, table with name/email/DGroup category/church/game-nights-attended), `/players/[id]` detail (full identity + DGroup fields already modeled in `lib/types.ts`, complete participation history — every game night, sport, skill level, which was their first).

Out of scope, per `docs/spec/00-overview.md`'s standing non-goals: no in-app editing anywhere on either page — this is the same "correct it in the Sheet or via re-upload" boundary as everywhere else. No pagination/virtualization work — real volume is expected to stay in the hundreds this season, trivially filterable client-side.

Explicitly deferred from the original filter list (Feature 5 named four): life stage and age bracket. Both derive from fields already in `Players` (`civil_status`, `birth_year`), so adding them later is additive, not a rework.

## States and ranges

- **Empty inventory** (no players uploaded yet): calm "nothing here yet, upload a roster to get started" — same tone as the dashboard and upload surface's empty states, not an error.
- **No search/filter results**: a distinct message from "no players exist" — "no players match" plus a visible way to clear filters, so it's never mistaken for the inventory actually being empty.
- **Loading**: real Sheets reads take real time (observed 0.5–3s in testing) — the list page needs a loading state that doesn't read as broken, matching the "snappy, not spinner-and-wait" register established for the upload flow.
- **Detail page for an unknown/stale ID**: graceful "player not found" state with a link back to the list, not a raw 404 or a crash — a stale bookmark or a manually-edited URL are the realistic causes.

## Interaction and layout

- List page: search input + two filter selects in one row above the table (matches the established pattern of controls living above the content they scope, not inside it). Live filtering as the admin types/selects — no submit button, no extra round-trip, since the full player list is fetched once server-side and filtered client-side (also keeps this off the Sheets API rate-limit path entirely; re-querying per keystroke would not).
- Table rows are the click target, full row navigates to the detail page — not a separate "view" link/button competing for attention.
- Detail page: identity block first, DGroup involvement block second, participation history as a table last (chronological, most recent first) — same information hierarchy as the leaderboard row it's the expansion of.
- Back navigation on the detail page is a real link back to `/players`, preserving whatever search/filter state is reasonable to preserve (exact mechanism — query params vs. browser back — is a build-time call, not a visual one).

## Constraints and open decisions

- Platform: web, Next.js, real Sheets-backed data (no mock layer exists anymore).
- Both pages are unauthenticated right now, same as `/upload` and `/dashboard` — access control is a separately scoped, not-yet-built surface (`docs/spec/04-access-control.md`), not something this brief solves.
- Open: exact preserved-state mechanism for "back to list keeps my filters" (query string is the likely answer, confirmed at build time).
