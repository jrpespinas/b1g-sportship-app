---
version: 1
slug: "dashboard"
primary_target: "dashboard"
related_targets: []
---

**Mode:** Operate. **Reader corrected 2026-08-16: the pastor comes first, and
reads it quarterly** — four cold reads a year, never habituated. Volunteer
heads check it after every four game nights. The earlier reading, "one
ministry admin, weekly, driving a page they already know at speed", is what
the density and the ≤6-word copy rule were calibrated for, and that reader is
now secondary.

**The one question:** *are people getting into groups?* Everything else on the
page is either the funnel feeding that or a different reader's job.

**The job.** Answer it without a page so dense it invites misreading. A view,
not a report: findings live in the marks, never in a paragraph. **Strictly
neutral voice** — the page reports and lets the pastor conclude, which is
exactly why order and weight have to carry the argument by themselves.

**Structure.** Two sections on one page, split by the only generous interval
on it. Season-to-date. Reordered 2026-08-16: the funnel used to be the tenth
element at 73% scroll depth and is now the first panel, at 11%.

*Spacing is the sectioning.* 12px between panels inside a section, **32px
above the break**, 12px below its heading — more space above a heading than
below it. Before this the page used 12px nine times in a row, which is why
nothing read as leading. Do not add a third interval.

The organiser half is a real `<section aria-labelledby>`, not a styled rule,
so the split exists for a screen reader too.

**Pastor section** (metric row · funnel · matching market · mix by sport),
then **For organisers** (attendance by sport · supply against demand · who
registers · the roster table).

1. *Numbers* — four wide metric panels, each headline carrying the parts that
   make it up. Unchanged and explicitly liked; do not flatten them back into
   narrow tiles. **Ordered placement-first** (not in a group · leaders ·
   unique participants · attended at least once): the two discipleship figures
   lead because they are the page's question, roster size is the denominator
   they are read against, and attendance is the organiser's number so it
   trails. It used to open with unique participants and attendance, which put
   the two figures the pastor demoted in the first 34px anyone reads.
2. **Matching market** — 40 of 40 seekers matchable, with the gender split as
   a **capacity-fill bar**: the whole bar is the leaders with room, the filled
   part is the seekers who would claim a place, and the empty three-quarters
   is the point. **Each bar is its own denominator** — the two markets never
   combine, and a shared scale was what made the dumbbell that preceded it
   unreadable (replaced 2026-08-14; a connector made the reader decode a
   distance, and one row stopped short of the right edge for a reason that was
   nowhere on screen). A per-seeker candidate-depth dot plot was built
   beneath it and **removed on request, 2026-08-14** — do not rebuild it
   without being asked. `getMatchingMarket` still returns the distribution
   (`candidateCounts`, min 1 / median 26 / max 68) if the abundance claim ever
   needs its evidence back in some other form.
3. **Supply against demand** — four butterflies: time, day, setup, location.
4. **Who registers** — a **bento of five independent tiles**, not one stacked
   panel. Spans on a 12-column grid, collapsing to one column below `lg`:

   | Tile | Span | Form |
   |---|---|---|
   | Who registers, by age | 8 | pyramid; the only tile with a panel header and the population line |
   | Where they work | 4 | top 8 areas as bars, remainder named |
   | Median age | 4 | metric panel |
   | Civil status | 4 | figures |
   | Church | 4 | figures |

   Ungrouped on request, 2026-08-14. They were one panel while an age-rooted
   cross-tab made every figure a cut of the same question; with that removed
   they are separate facts about the same people, and three internal rules in
   a tall panel asserted a relationship they no longer have. Equal thirds on
   the second row **on purpose** — the top row's 8/4 already sets the rhythm,
   and content length does not track column count here, so unequal spans would
   only hand the widest tile to the shortest list.

   A per-band cross-tab strip (women, single, CCF, leaders, not-in-a-group)
   was built beneath the pyramid and **removed on request, 2026-08-14** — do
   not rebuild it without being asked. `getRegistrationDemographics` still
   returns `crossTab`.
5. **Attendance by sport** — Total facet first, then alphabetical.
6. **Discipleship mix by sport** — Total facet first, then alphabetical.
7. **Where everyone stands** — funnel on the left, movement on the right, one
   panel split down the middle. Movement is **three figures** (moved up ·
   stepped back · unclear), one caveat line, and a link — not a chart, because
   a couple of dozen movers cannot support a trend, and **not a named list**:
   the fifteen names shipped here and were **removed on request, 2026-08-14**.
   They are not lost, they moved to where a follow-up happens —
   `/players?view=moved` carries the same people with contact details and an
   export. That view is the superset (everyone whose answer ever changed, not
   just the ones who moved up), so the link label states the number it lands
   on rather than the number above it. The three figures stay separate rather
   than summed: forward is the ministry working, backward is a conversation,
   unclear is a data problem.
8. **Heading toward leading** — the leadership-intent pipeline.
9. **Switchable roster table** — returning / no-show / returning-but-unplaced.

**Vocabulary, confirmed by the user 2026-08-16.** These are the ministry's own
words, not jargon to be translated — flattening them would make the page
disagree with how the pastor speaks. Applies app-wide, not just here.

| Term | What it is | |
|---|---|---|
| **DGroup** | a discipleship **group** | never a person |
| **DGroup leader** | the person leading one | |
| **D12** | a DGroup leader whose members are themselves DGroup leaders | a person, not a group |
| **absorb** | take a new member | **the form's own word — keep it** |

The app had a category error here: it labelled a metric "DGroup leaders" and
split it into "DLeaders" and "D12", inventing an abbreviation and reading D12
as a peer of leaders rather than a kind of leader. It now reads *Discipleship
group leaders · 134 lead a group · 53 D12 — lead leaders*.

"Absorb" is kept everywhere rather than softened to "take someone new":
leaders answered a form question phrased that way, and reporting a different
word back invents a second vocabulary for one concept. Change the form first
if it should change.

**Coined terms are not allowed to carry findings.** "Thinnest room" became
"lowest show-up"; "a stock, not a flow" became a plain sentence. A reader who
sees the page four times a year has no chance to learn a private idiom.

**Copy rule.** Title, plus a **≤6-word unit or population label** only where
its absence causes a silent misread. No subtitle argues. Findings go into the
encoding or onto a chip on the facet they belong to.

**Palette.** Blue and orange only. Blue carries depth of involvement and the
present/returning side; orange carries absence and first-timers. A six-step
sequential blue ramp (`--color-blue-1`…`6`) feeds the funnel, the age bands
and the pipeline. **Green means capacity and placement** — absorber chips,
involvement badges, the spare remainder of the matching bar — and never
appears as a chart mark elsewhere. The butterflies reuse the segment tokens
exactly (`--color-seg-leaders` for the offer side, `--color-seg-seekers` for
the want side), and the matching bar reuses `--color-seg-seekers` for the
people waiting, so a reader who learned the funnel needs no second legend.

**One classification, and it reads both hand-raising fields.** Hardened
2026-08-14. `categoryFromAnswers` in `lib/dgroup.ts` is the only rule on this
surface; the funnel used to carry a private one, which is why two panels
disagreed (40 seekers against 48, 449 not-involved against 121) and why a
funnel row reading "D12 · 53" linked to 187 names.

Two form fields carry "I want a group": the current
`dgroup_interested_in_joining` and the older membership option "No, but I am
seeking for a group". Reading only the first found **40** seekers; reading
both finds **86** — confirmed independently by the form, which branched
exactly 86 people into the "Type of Discipleship Group you plan to join"
block. The 46 that were missing had asked in writing and named the group they
wanted, and the page was filing them under "have not been asked".

**"Never asked" is its own stage, not part of "not involved."** 72 players
have no discipleship answer of any kind; 331 answered and are not in a group.
The follow-up differs — one is an invitation, the other a conversation — so
the buckets differ. Every funnel row links by category, so each lands on
exactly the people it counted, and the destination names itself after the
category rather than reading "Custom cut".

**Ordering rule.** Every sport-facetted panel runs Total first, then
alphabetically, so two grids of the same five sports can be read against each
other position by position. Rankings are marked with a chip, never with
position — the "thinnest room" chip on Running exists for exactly this, and
the Total facet is excluded from that ranking because it is the baseline the
sports are read against.

**Chart forms serve the question, and six have been cut for failing that
test:** an arrival ridgeline (answered a door-staffing question nobody had),
an eight-column cohort-decay grid (56 cells for what is two numbers a month),
an attendance-banded demographics grid (four populations to hold in mind
before learning one fact), a newcomer-return table (removed on request), the
commitment curve, and the registered-against-attended line chart (subsumed by
metric 30's Total facet, which carries the same comparison against a
part-to-whole baseline). None was wrong; each answered a question the audience
did not have. Prefer the plainer form that says more.

**Two refusals, both standing.** Registrations and attendance are never
stacked as two series — attendance is a subset, so stacking double-counts;
`attended + no-show = registered` carries identical information. And "what
factors most contribute to a seeker being absorbed" has no answer, because
absorption is not observable. The age cross-tab was offered as the nearest
honest substitute and has since been removed from the page; the refusal itself
stands, and nothing on this surface may imply a driver analysis exists.

**What the data refused, and the fix.** Three of the requested transitions
need a person's status at two points in time. `DGroup Leader Name` was
investigated as an alternative signal on 2026-08-14 and rejected (450 of its
583 holders are already Members, none are seekers). Measured at build time:
32 players ever changed their answer, 15 of them upward, 7 backward and 10
too uncertain to name (round trips, and the D12/DGroup-Member wording pair).
At n=15 the honest form is a named list, not a chart. The fix is that the
registration form must re-ask returning players their status — a collection
change, not a visualization one, and the panel says so in one line with its
own denominator.

**Where a variable does not move, say so rather than dropping it.** Three of
the four supply/demand dimensions overlap almost perfectly; all four are drawn
because the overlap *is* the finding and it makes the time gap legible by
contrast. The layout carries that too: time occupies the left column alone and
the three that agree stack beside it.

**How the supply/demand gap is decided.** By a **rank test** — do the two
sides' most-chosen values agree — never by a distance measure. Time is spread
over sixteen hourly rows and setup over three, so any distance would report
the dimension with the most categories as the most divergent regardless of
what anyone answered. The chip lands on time because leaders' first choice is
1pm and seekers' is 5pm.

**Butterfly wings are share of their own population, never counts.** 184
leaders describe a group they run against 86 seekers describing one they want;
on a shared count axis every seeker bar lands at half its counterpart and
proportional agreement reads as a shortfall. The number printed beside a bar
is therefore the share, matching what the bar encodes. Days are multi-select,
so a column of shares exceeds 100% — correct, and the denominator is people,
not answers. A third population, the 126 leaders describing a group they plan
to lead, is named in the subtitle and kept out of the offer wing, because
`buildMatchBoard` scores against the 184 only and the two surfaces must not
disagree about who can take someone.

**The Sheets reads are cached; do not reintroduce "reads live off the Sheet
on every request".** Measured 2026-08-16: three parallel tab reads cost
904–1450ms and were essentially the entire server render — the aggregation
over a thousand players does not register beside it. `readTab` is now wrapped
in `unstable_cache` with a five-minute TTL and a `sheets` tag, which took the
dashboard's TTFB from **870–1130ms to 27–53ms** and made a burst of page views
cost one round-trip per tab instead of one per page. The per-minute read quota
was reachable before this and renders as a raw error page when hit.

Writes call `updateTag`, **not** `revalidateTag`: the latter now defaults to
stale-while-revalidate, which would serve the pre-upload numbers once more to
the admin who just uploaded — the one moment stale data is least acceptable.

**Binding constraints.** Charts are inline SVG in the `components/charts`
idiom: `viewBox` + `w-full`, a `min-w` floor inside `overflow-x-auto`, a
`<title>` written as **one** interpolated string (multi-child SVG titles
hydrate as a mismatch), and 11px axis labels. Server-rendered charts use
`aria-label` rather than `useId` + `aria-labelledby` — hooks are unavailable
in a server component. A `min-w-*` on a table can still propagate to the
document's scroll width even inside `overflow-x-auto` — check 390px before
assuming a wrapper contains it (measured 2026-08-14: document scrollWidth is
390 with four such floors on the page). Client chart components must import
from `lib/dashboard-metrics` **type-only**; a value import reaches `lib/store`
and pulls `googleapis` into the browser bundle — which is why `TOTAL_FACET`
lives in `lib/facets.ts` and why the roster table is fed slimmed rows rather
than `Player` objects. Game-night dates are calendar dates, formatted by
reading the string (`lib/format-date.ts`), never via `new Date`. DGroup
meeting times are Excel serial dates and are read the same way — never
timezone-converted.

**One coverage number, not two.** The per-night discipleship mix is a
measurement where a participation carries its own answer and an inference
where it does not, and `resolveParticipationSegment` decides that on *either*
the status or the interest field — 42% of participations, not the 31% that
counting `dgroup_status` alone reports. The mandatory coverage label on the
mix panel quotes the figure the charts actually use.
