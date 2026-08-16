---
version: 1
slug: "player-directory"
primary_target: "player-directory"
related_targets: []
---

## Job and audience

Admin (shared credential, the same person who runs uploads). **Operate** mode.
Two jobs share the surface, and as of 2026-08-12 the first one leads:

- **Work a list.** Arrive from a dashboard figure, narrow the set, get it out
  to whoever will act on it.
- **Look one person up.** Mid-conversation — "does this person have a DGroup
  yet?" This is the original job and it still has to stay fast.

## Outcome and proof

The list's job is to **leave the app**. Confirmed with the user: follow-up
happens by handing a list to DGroup leaders, or by messaging people during the
week — nobody works this on a phone at the courts. So success is measured
outside the product: a usable list reached the person doing the outreach.
Export is the surface's focal action, not a convenience bolted to a table.

Not generic CRUD, and not a generic CRM export: every row carries *why this
person is on the list* — their segment, whether they have capacity to absorb
someone, and when they last actually turned up. The cut nothing else can
produce is "keeps coming, still not in a group."

## Selected direction

**Visual world: the Analyst Register, extended from `/dashboard`.** Grey page
ground, flat bordered panels, no shadow, 13px density. Not a new world —
DESIGN.md scoped this register to the dashboard and named a second pass; this
is it. `/players/[id]` gets the same chrome in the same pass, because a
register change one click deep would read as two different apps.

**Structural thesis: a table that says what it is showing.** The register's
explanation-line discipline applied to a list — the panel header carries the
active list's name, one sentence on what it is for, and a live count, so a
number never appears bare.

**Vocabulary: segments became primary**, with the five-way category demoted to
a detail on the row. This resolves rather than bends DESIGN.md's rule against
linking a figure to a filter that cannot express it: "Leaders" spans two
categories, which is why that figure had no link. It has one now.

## Scope and boundaries

In: `/players` (named views, segment-first filtering, filter-aware summary,
new columns, CSV export + copy-emails, paging), `/players/[id]` (chrome only).

Anti-goals, explicit:

- **No editing, no contacted-state, no notes.** Confirmed with the user; the
  standing non-goal holds and the Sheet stays the system of record. A half-CRM
  nobody updates shows stale flags that actively mislead.
- **No per-leader splitting of the export.** There is no leader↔seeker
  assignment data in the system yet. The admin filters and decides the handoff
  by hand; splitting is the matching surface's job, not this one's.
- No discipleship timeline on the detail page — that is the next pass, and the
  point-in-time data it needs is already captured and unused.
- `/upload` keeps the original register this pass.

## States and ranges

1080 players, 2801 participations, 17 nights today; design for a few thousand
as seasons accumulate. Named views land around 41 / 134 / 500+. Two distinct
empty states preserved: nothing uploaded at all versus nothing matches this
cut. Sheets reads run 0.5–3s, so both routes carry skeletons in the register.
Export is disabled at zero rows rather than emitting an empty file. Copy has a
failure state — `navigator.clipboard` is unavailable outside a secure context.

## Interaction and layout

- **Named views as chips**, each carrying its own count, above the filters.
  Five: All players · Seekers · Leaders with capacity · Not involved 3+ ·
  Members 5+. Each maps to a reason the ministry gave for wanting the app.
  Editing any filter on top drops the highlight and reports a "Custom cut"
  rather than leaving a view highlighted that no longer describes the screen.
- **`?view=` is an entry convention only.** The dashboard links in with one; it
  is expanded to real criteria on mount and never written back, so there is
  exactly one representation of the current cut in the URL.
- **"Last seen" counts game nights, not days.** The season has real two- and
  three-week gaps, so "three weeks ago" says nothing about whether someone has
  stopped coming. 0 reads "Most recent night".
- **Two export shapes**, because the user named two follow-up paths: CSV for
  the leader handoff, copy-emails for the messaging path. Both act on the full
  filtered set, never the visible page, and the button carries the count.
- Row links to detail; controls sit above the content they scope; the dense
  table keeps the established horizontal-scroll-with-fade on narrow viewports.
- Paging is "show 50 more" rather than numbered pages — nobody scans 1080 rows,
  they filter — and every control resets it as it changes the set.

## Constraints and open decisions

- Next.js App Router, live Sheets reads, `force-dynamic`, one fetch filtered
  client-side. That is deliberate: it keeps filtering instant and off the
  Sheets rate-limit path.
- Unauthenticated, same as every route; access control still deferred to
  `docs/spec/04-access-control.md`.
- **Flagged, not solved: the CSV is PII leaving the system.** Real names,
  emails, and phone numbers handed to volunteers. `lib/player-export.ts` ships
  only the fields a recipient needs and defuses spreadsheet formula injection
  on every cell, but who may receive one of these files is a policy question
  the app does not answer.
- Back-from-detail relies on the browser, not a preserved link — the URL
  carries the full cut, so browser back restores it exactly; the explicit
  "Back to players" link is a deliberate start-over.
- Open: whether D12 versus DGroup Leader ever needs its own filter, or stays a
  row detail as it is now.

## Movement — added 2026-08-12

The point-in-time status captured by the backfill answers one question a
current-standing snapshot cannot: **who changed**. Measured before designing
anything, that is 32 of 1080 players. 847 answered the question at least once,
191 answered on two or more nights, and only those 32 ever gave a different
answer.

That number decided the shape. A per-person "discipleship journey" was the
obvious feature and the wrong one: it would read "no recorded change" for
roughly 1048 people, and the 32 who did move would stay invisible unless
someone clicked through the directory one row at a time. Movement is a
**discovery** problem, so it ships as a dashboard panel and a `moved` worklist
view, with the per-person record folded into the participation table that
already existed rather than built as a separate timeline component.

**Uncertainty is reported, not hidden.** Two measured reasons a recorded
change may not be real movement, both surfaced rather than filtered out:

- `D12 (DMembers already leading a DGroup)` and `DGroup Member` overlap in the
  form's own wording — 9 of the season's transitions are this pair, and any of
  them may be a reading of the question rather than a move.
- 3 of the 36 changers return to a standing they already held, which is
  inconsistent answering rather than a journey.

Those land in a third bucket, held out of "stepped into leadership" so the
headline number stays trustworthy. The dashboard's three figures are mutually
exclusive and sum to the total in its own header — a breakdown a reader cannot
reconcile against its stated total reads as a bug, whatever the caveats say.

A blank standing on a night is labelled **"Not re-asked"**, never "—": the
form lets a returning registrant keep their previous answers and most do, so a
blank is a choice the person made, not data the app lost.
