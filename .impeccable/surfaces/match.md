---
version: 1
slug: "match"
primary_target: "match"
related_targets: []
---

## Job and audience

Admin, shared credential, same person who runs uploads. **Operate** mode.

One job: place the people who asked for a discipleship group with the leaders
who said they can take someone. This is the app's founding purpose — *"we want
to highlight those who are seekers and leaders willing to absorb, so that we
can match them"* — and the first surface that acts on it rather than reporting
around it.

## Outcome and proof

Primary path: work down the seeker list, read each one's ranked candidates,
pick a leader, hand it off. Success is a placement decision made in seconds
with enough evidence to defend it.

**The proof is the criteria breakdown, not the score.** A number cannot carry
a pastoral decision: someone has to see that a leader agrees on place, format
and day but meets an hour later, and judge whether that hour matters. Every
candidate shows all five criteria, met and missed, with the values compared.

## Selected direction

**Visual world: the Analyst Register, inherited.** Third surface in it — grey
ground, flat bordered panels, 13px density. No new tokens, no DESIGN.md
change.

**Structural thesis: the seeker is the unit of work.** One panel per seeker —
their stated wants condensed to a line, then ranked candidates beneath. The
page is a queue of decisions, not a database view. Seekers are ordered
hardest-to-place first, because a three-of-five needs human thought while a
five-of-five is quick.

**Signature element: the criteria strip.** Five marks per candidate (location,
format, day, age, time), each carrying its outcome and what it compared. It is
what makes a suggestion auditable instead of oracular, and it is the thing this
surface owns.

**Scoring, never filtering.** Measured before designing: requiring all six
stated preferences to agree matches **zero of 40 seekers**. Scored across five
interpreted criteria, every seeker has a viable candidate. The strict read
invented a shortage that does not exist, so no one is ever filtered out of
view.

## Scope and boundaries

In: `/match`; seeker-first ranked panels; the criteria strip; a combined match
sheet CSV; per-leader packets; nav entry; the dashboard's "Match them" link.

Anti-goals, each with a measured reason:

- **No capacity numbers anywhere.** `How many members are you willing to
  absorb?` is blank for all 148 leaders, so the app must never imply someone
  has N slots.
- **Language is not a criterion.** 34 of 40 seekers and 130 of 148 leaders both
  answer "Filipino/English" — it separates almost nobody. Surfaced only when
  the two sides genuinely differ.
- **No persisted assignments.** The read-only boundary holds: the app suggests,
  a human decides, the Sheet stays the system of record.
- **Not the 449 "Not involved."** They have not asked for a group. Matching
  them would presume; they belong to the directory's conversation worklist.
- No auto-assignment, no messaging anyone from the app.

## States and ranges

40 seekers against 148 leaders with capacity; both grow. Best-match
distribution today: 9 strong, 21 workable, 10 needing a judgement call — the
three buckets are mutually exclusive and sum to the seeker count.

- **Unparseable age** — 2 of 40 seekers, 5 of 148 leaders. Reads "age not
  stated as a number", is excluded from the denominator, and is never counted
  as a miss.
- **"Others" as a location** — 7 seekers and 15 leaders chose it. Two people
  who both declined to name a place are not demonstrably in the same place, so
  this scores as a miss with that stated, never as agreement.
- Empty state when nobody is currently seeking.

## Interaction and layout

- Three candidates shown per seeker, "show more" reveals the rest ranked, and
  the control says how many of the full set were compared.
- The criteria strip uses drawn icons and ink weight for state — no second
  accent, per the register.
- **Two exports.** The match sheet is one file the admin works from. Per-leader
  packets are one file each, listing only the seekers suggested for that
  leader — what actually gets handed to a person. Packets sit **below** the
  seeker panels behind a disclosure: you download one after deciding, and a
  wall of ~55 leader chips above the work buries the work.
- Mobile: panels stack, the criteria strip wraps, and the summary's
  explanation goes full width beneath the figures rather than into a narrow
  column beside them.

## Constraints and open decisions

- Preference answers live in `raw_json`, read by exact source-header text
  (including the form's own typos, "your are leading"). Promoting them to real
  Players columns is optional future work; nothing here needs it.
- Same Sheets read path, `force-dynamic`, matching computed in memory —
  40 × 148 comparisons is trivial. The board is slimmed server-side before it
  reaches the client, because shipping full `Player` records with their `raw`
  payloads would be megabytes to draw a few dozen rows.
- **PII escalation, flagged not solved:** these exports pair *two* people's
  contact details in one row. Every prior export in this app described one
  person per row. That is a materially larger disclosure and deserves a
  decision about who may receive one.
- **Age and time are interpretations of free text**, not lookups — "25-30"
  against "22-35", 6pm against 7pm within an hour's tolerance. The surface
  shows what it compared so a wrong read is catchable rather than buried.
- Open: whether the hardest-first ordering is right, or whether quick wins
  first would suit how the work actually gets done.

## The gender gate — added 2026-08-12

**Men are placed with men and women with women.** Groups are not mixed, so
this is a **gate, not a criterion**: it runs before any scoring, a
cross-gender pairing is never built or ranked, and it never enters the score.
Putting it in the five-criteria strip would imply four agreements could
outweigh a disagreement here, which is exactly what it must not imply.

Measured before applying it. Coverage is complete where it matters: all 40
seekers state a gender (22 male, 18 female) and all 148 leaders do (79 male,
69 female). No seeker loses their pool — every one still has 51+ same-gender
leaders to compare against. The cost is small and it is the right cost:

| Best match | Before the gate | After |
|---|---|---|
| 5 of 5 | 9 | 5 |
| 4 of 5 | 21 | 22 |
| 3 of 5 | 10 | 12 |
| 2 of 5 | 0 | 1 |

Four seekers lose a "perfect" match — but those four were cross-gender
suggestions the app should never have made. Nothing of value was lost; bad
advice was removed.

**The gate is stated, not silent.** Each seeker panel reads "Compared against
69 female leaders". This surface's whole premise is that a suggestion shows
its work, and a filter nobody can see from the screen contradicts that.

**Blanks are never guessed.** 72 players elsewhere in the roster leave gender
blank, so the case will arrive even though it is nobody today. A seeker with
no recorded gender gets no suggestions and a panel saying why — a prompt to go
and ask, not a silent dead end. A seeker whose gender has no leader with
capacity reads as a group that needs planting rather than a match that needs
finding.

**The dashboard splits capacity the same way.** A single combined surplus
counts male capacity against female seekers, which is a placement nobody can
make, so "Placing seekers" now shows the two markets separately (male +57,
female +51) and the combined figure was removed rather than left alongside to
contradict it.

**Not buildable from this data:** `Marital Status of Discipleship Group your
are leading` is blank for all 148 leaders, same as capacity. A singles/couples
split would need the form to start capturing it.

## The day gate — added 2026-08-12

**A leader must meet on a day the seeker is free.** Like gender, this is a
gate rather than a criterion: a group that meets when you cannot come is not a
worse match, it is not a match. Scoring it would let four other agreements
outvote the one thing that makes attendance possible at all.

Measured before applying. **Nobody is stranded:** every one of the 40 seekers
has at least one same-gender leader meeting on a day they want. Median pool
26, smallest 1, largest 68. All 40 stated a day, so the blank case is
hypothetical today — but it is handled, because it will not stay that way.

**Scoring is now four criteria, not five:** place, format, age, time. Day left
the score because it is guaranteed by the gate, and a criterion every
surviving candidate satisfies hands them all the same free point.

**The shared day is still shown**, beside each candidate's score, because
*which* day they share is the useful part and it varies between candidates.
It carries no check or cross — it is a fact, not a judgement.

Bucket thresholds are measured against **each seeker's own denominator**
rather than a fixed number. A criterion nobody could judge is out of the
score, so "strong" means everything judgeable agrees — comparing a 3 against a
hardcoded 4 would demote someone whose age was simply never written down.

**Supply and demand by day**, worth watching as a planting signal: leaders
offer Sunday 64, Saturday 48, Thursday 19, Wednesday 16, Tuesday 15, Friday 4,
Monday 4. Seekers want Saturday 23, Sunday 20, Friday 9, Monday 7,
Wednesday 5, Tuesday 2, Thursday 2. Friday and Monday are the thin spots —
nine and seven seekers against four leaders each.

## Composition parity with the other analyst surfaces — 2026-08-12

The register was always shared — `Panel`, `Badge`, `Button` are the same
primitives — but the composition diverged, and that read as a different page.
Three measured gaps, all closed:

- **Width.** 880 against the 1280 both other surfaces use. Narrower also forced
  the criteria strip to wrap, which is why it looked ragged rather than
  scannable.
- **Hand-rolled figures.** The dashboard uses `MetricPanel`, whose `note` slot
  carries a required explanation line *per figure*. This surface hand-rolled
  three figures and put all the methodology in one paragraph beside them —
  the tall narrow text column that looked wrong at every width. Now three
  `MetricPanel`s, each explaining its own number, with a fourth appearing only
  when a gate has blocked somebody.
- **No control layer.** With 40 stacked panels there was no way to find one
  person. Now the Players pattern: outcome chips carrying their own counts
  (All / Strong / Workable / Needs a call / Nobody to suggest), search by name
  or email, and filters for gender and for day wanted.

**Candidates became an aligned table**, one row each, with a fixed column per
criterion. The alternative — a verdict table of "Matches on / Differs on" —
was rejected because it drops the compared values, and those values are what
make a suggestion auditable rather than oracular. `table-fixed` with an
explicit `colgroup` is load-bearing here, not styling: auto layout gives every
seeker's table its own widths, and columns that do not line up between panels
defeat the reason for having columns.

Export and packets now follow the current filter, so "work the women's
Saturday list" produces a sheet of exactly that.
