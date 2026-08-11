---
version: 1
slug: "dashboard"
primary_target: "dashboard"
related_targets: []
---

## Job and audience

A pastor overseeing the sports ministry, reading as a senior data analyst
would. Checks in periodically, not daily. Read-only.

Revised 2026-08-11: the job is no longer "report how the program is doing."
The user stated the purpose directly — *involve participants in groups*. Match
seekers to leaders with room; find the not-involved so someone can talk to
them in person; find members worth inviting into leadership. That makes this a
**worklist generator**, and every figure on it has to lead to a list of named
people rather than sit as a number.

## Outcome and proof

Success is leaving with a name, or a short list of them, and a reason to start
the conversation. Not "attendance is 157."

Proof this is not a generic analytics page: the segmentation is the ministry's
own discipleship pipeline, the headline metric is a *matching market*
(seekers against leaders with capacity), and the leaderboard's job is to
surface the person who attends most and has still never been placed.

## Selected direction

**Visual world: replaced.** The previous white/Ember Apple-Health register was
overhauled at the user's request ("completely to something professional"),
against a supplied reference: a dense data-observability tool. Confirmed
choices from the direction round:

- **Ember keeps actions.** The reference's indigo was not adopted wholesale;
  Ember carries links, primary state and the honesty banner, so the recorded
  brand commitment survives.
- **Density, layout and type character come from the reference.** Grey page
  ground with white panels, hairline borders, **no card shadow** (depth is
  ground-vs-panel contrast, which is what lets panels sit shoulder to shoulder
  at this density), a larger headline figure, 12–13px supporting text, and a
  line of plain-language explanation under every figure. That microcopy is
  load-bearing, not decoration: each number here is read by someone deciding
  who to talk to, and a bare figure invites the wrong read.
- **Data marks get their own palette.** Discipleship segments use an **ordinal
  single-hue blue ramp** — darker means deeper involvement — so the stacked
  bands read as a gradient of involvement rather than four unrelated hues. Run
  through `validate_palette.js --ordinal`: the first attempt failed
  (`#cde2fb`, 1.32:1, under the 2:1 light-end floor) and was re-stepped to
  650/500/400/250, which passes every check.
- **Scope:** dashboard only. Upload and Players stay in the old register until
  a second pass, by the user's choice.

**Composition, top to bottom:** a lede naming the weakest point in the estate;
an honesty banner whenever segment history is inferred; four metric panels
answering the pastor's four questions verbatim; the seekers-vs-capacity
matching panel; attendance and discipleship-mix charts side by side; per-sport
small multiples with one shared legend and a count/share toggle; the
most-committed leaderboard carrying each player's segment.

**The count/share toggle** replaced two near-duplicate chart sets. Counts and
shares answer different questions off the same bands — raw counts mostly track
how popular a sport is, whereas the *share* of a room that is uninvolved says
which sport is actually reaching the unreached — so they are one control, not
two grids.

## Scope and boundaries

In scope: the four segment questions, the capacity match, mix-per-night,
mix-per-night-per-sport (count and share), and the leaderboard's segment
column.

Out of scope, unchanged: any control that mutates data; a per-game-night
selector; church-affiliation and life-stage breakdowns.

Deliberately **not** built: a "willing to absorb" filter on the player
directory. The dashboard's capacity figure is the only worklist here that
cannot be clicked through to its people, because the directory filter speaks
the five-way category and has no absorb predicate. It is the top follow-up.

## States and ranges

- **Inferred segment history** is a first-class state, not an edge case. Until
  the backfill runs, every night falls back to each player's latest status and
  the banner says so in plain words. Totals stay correct; the per-night shape
  is an estimate.
- **A sport that did not run on a given night** breaks the ribbon in share
  mode rather than plotting 0% — a 0% band would read as that sport's
  discipleship collapsing on a night it simply had no session.
- Day-one/empty estate: calm, single panel, unchanged in tone.

## Interaction and layout

- Panels are static; the only stateful control is the count/share toggle.
- The per-sport legend **wraps rather than hides** on narrow screens — it is
  the only key those five charts have.
- Charts keep the hover tooltip and the "view as table" twin. The small
  multiples suppress their individual legends and their table toggles; the
  panel's shared legend serves all five.
- Mobile is the same reading order stacked; the grid collapses at `sm`.

## Constraints and open decisions

- Platform: web, Next.js, real Sheets-backed data.
- Every figure that maps cleanly onto the directory's five-way filter links
  out to it. Leaders does not map cleanly (it spans two categories) and so
  does not link — better no link than one that quietly shows a different set
  of people than the number counted.
- Open: dark mode, unchanged — not a v1 commitment.
- Open: carrying this register to Upload and Players.
