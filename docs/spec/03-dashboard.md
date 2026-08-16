# Dashboard — Pastor/Volunteer Surface

Read-only (see [04-access-control.md](04-access-control.md)). Reads live off
`Players` and `Participations`, both defined in
[01-data-model.md](01-data-model.md). No write path exists on this surface,
ever — see `PRODUCT.md` Product Principles.

`dashboard_simple.jpg` (repo root) is retired as a reference — it included a
Transportation and T-shirt-size tile that don't apply to this build. The
metrics below are the authoritative, user-specified requirement list, and are
also the reason the data model has an append-only `Participations` table:
several of these (weekly counts, time series, "frequent sports for returning
players") are impossible to compute from a model that only remembers each
person's latest state — they require per-game-night history.

## Metrics

1. **Total unique participants.** `COUNT(DISTINCT player_id)` in `Players`
   (equivalently, distinct `player_id` across all of `Participations`) —
   all-time, not scoped to a single game night.
2. **Weekly participants.** `COUNT(*)` of `Participations` rows for a given
   `game_night_id` — the most recent by default; the dashboard should let the
   viewer pick an earlier game night too, since "weekly" implies more than one
   data point exists.
3. **Gender ratio.** `Players.gender` distribution, all-time (gender is an
   identity field, not per-game-night, so this isn't scoped to a single week).
4. **Returnees vs. first-timers (counts).** Per `Participations` row,
   `is_first_participation` (computed at write time — see
   [01-data-model.md](01-data-model.md), not the form's self-reported
   checkbox) splits the count. Report both as a total-to-date figure and,
   probably more useful operationally, for the latest game night specifically.
5. **Time series of returnees vs. first-timers per game night.** Group
   `Participations` by `game_night_id`, ordered by `Game Nights.game_night_date`;
   for each point, count rows where `is_first_participation` is true vs. false.
6. **Seeking a DGroup.** `Players.dgroup_interested_in_joining = "Yes"`,
   strictly. **Resolved:** the form's other two options — "No" and "Cannot
   decide. I will pray about it" (confirmed exact values, pulled from real
   response data) — both count as *not* seeking, for now.
7. **DGroup leaders.** `COUNT(Players)` where `dgroup_status` (the "Your
   DGroup Status?" field) is `"DGroup Leader"` **or**
   `"D12 (DMembers already leading a DGroup)"` (exact strings, confirmed
   against real response data — note the source data's own "DMembers" typo,
   preserved as-is since it's what values in the sheet will actually contain).
   `dgroup_member_status` ("Are you part of a Discipleship Group?") is a
   separate, coarser field (Yes / No / "No, but I am seeking for a group")
   and is not used for this count.
8. **DGroup leaders willing to absorb members.** Same leader population from
   (7), filtered by `dgroup_leading_willing_to_absorb`.
9. **DGroup members.** New metric, added alongside (7)/(8): `COUNT(Players)`
   where `dgroup_status = "DGroup Member"`.
10. **First-timers per sport, all-time.** Resolved to a narrower metric than
    originally scoped — this is specifically "which sport do new players
    choose," not a returnee/first-timer split per sport. `COUNT(Participations)`
    grouped by `sport_selected`, filtered to `is_first_participation = true`
    only. (Returnees-per-sport isn't a tracked metric for now — the same data
    supports adding it back later if wanted, it just isn't part of the
    confirmed list.)
11. **Top returning players and their frequent sports.** Rank `player_id` by
    `COUNT(Participations)` descending (a leaderboard — needs a cutoff, e.g.
    top 10, and arguably a minimum of 2 appearances to even qualify as
    "returning"). For each, `sport_selected` mode across their own
    `Participations` rows is their "frequent sport" (ties possible — show
    more than one if genuinely tied).

Metrics (4) and (5) together are what answer "are there always new players at
a given game night" — the per-game-night first-timer count/trend. Metric (10)
answers a different question — "which sport is popular with new players" —
and is intentionally all-time/cumulative rather than per-game-night, so don't
conflate the two when building the tiles.

## Discipleship pipeline — added 2026-08-11

Requested directly by the pastor overseeing the ministry, with the purpose
stated plainly: *involve participants in groups*. Match seekers to leaders
with room; find the not-involved so someone can talk to them in person; find
members worth inviting into leadership. Every metric below exists to produce
a **list of named people**, not a number — so each one links through to the
player directory filtered to that set.

### The segmentation

One four-way partition of every player, derived in `lib/dgroup.ts` from the
same `categoryFromAnswers` rule the directory filter uses, so the surfaces
cannot disagree about what "a leader" means:

| Segment | Rule | Why it is its own bucket |
|---|---|---|
| **Leaders** | `dgroup_status` is `DGroup Leader` **or** `D12 (…)` | Both have capacity to absorb; the follow-up move is identical |
| **Members** | `dgroup_status = "DGroup Member"` | In a group, not leading — the pool to invite into leadership |
| **Seekers** | not in a group, `dgroup_interested_in_joining = "Yes"` | Raised their hand; needs placing |
| **Not involved** | everything else | Has not been asked — the largest bucket and the real work |

The four are mutually exclusive and sum to the estate.

12. **Segment breakdown.** The four counts above, in pipeline order (not
    sorted by size — the order is the journey).
13. **Leadership capacity.** Leaders split D12 / DLeader, how many are willing
    to absorb, and `willingToAbsorb − seekers`. That surplus is the single
    most decision-shaped number on the page: it says whether the bottleneck is
    capacity or willingness. At the time of writing it is **+93** (134 willing,
    41 seeking) — so capacity is not the constraint, and the 470 who have not
    asked at all are.
14. **Segment mix per game night.** Stacked area over game nights. Answers
    "is the room getting more discipled over time."
15. **Segment mix per game night, per sport.** Same bands, small multiples,
    with a count/share toggle. Share is the more useful of the two — raw
    counts mostly track how popular a sport is, whereas the *share* of a room
    that is uninvolved says which sport is actually reaching the unreached.
16. **Top returning players carry their segment** (extends metric 11). A
    17-night regular who is still "Not involved" is the warmest conversation
    the ministry has available, and that only becomes visible when attendance
    and discipleship sit in the same row.

### Point-in-time versus current status — read this before trusting (14) or (15)

Discipleship status is a **Player** attribute. Metrics (14) and (15) need it
per **attendance**, which is a different thing: what was true of this person
*on that night*.

`Participations` carries `dgroup_status`, `dgroup_interested_in_joining`, and
`dgroup_leading_willing_to_absorb` for exactly this reason (added 2026-08-11).
Where a row has them, the charts are a measurement. Where it does not — every
row uploaded before that date — `resolveParticipationSegment` falls back to
the player's latest record and marks the point `pointInTime: false`, and the
dashboard shows a banner naming how many nights are inferred.

**An inferred night is not a fact.** It applies today's status backwards, so
somebody who joined a group in June reads as a member in February and the
pipeline appears to have been healthier than it was. Totals stay correct; the
per-night *shape* is an estimate. `docs/spec/05-backfill.md` is the procedure
that converts the estimate into a measurement, and until it has been run the
banner stays up.

## Sport breakdown

Fixed 5-value set only: 🏀 Basketball, 🏸 Badminton, 🏐 Volleyball,
🥒 Pickleball, 🏃 Running. No skill-level tile — confirmed irrelevant to the
dashboard (still retained in `Participations` for the admin's own
team-balancing use, just not surfaced here).

## Refresh strategy

Uploads happen roughly weekly, not continuously — the dashboard does not need
real-time updates. On-demand refresh (or a coarse periodic revalidation, e.g.
every few hours) is sufficient and keeps Google Sheets API usage well clear of
rate limits.

## Explicitly out of scope here

- Any control that mutates `Players`, `Game Nights`, or `Participations`.
- Target-vs-registered / % completion — was in the retired `dashboard_simple.jpg`
  reference, not in the confirmed metric list above. Drop unless requested
  separately; a "target" number was never derivable from registrant data
  anyway (it's a goal someone sets, not something in the sheet).
- Church affiliation and life-stage breakdowns — same reason: present in the
  retired mockup, not in the confirmed list. `Players` still carries the
  underlying fields, so adding these later is a dashboard-only change, not a
  data-model change.

---

# Attendance metrics — added 2026-08-13

Everything above was computed from **registrations**, because that was all the
app had. With door check-in files now uploaded for 15 of 17 nights
([06-attendance.md](06-attendance.md)), five things become answerable that
were not before. Measured across those 15 nights: **2,452 registrations
produced 1,610 arrivals — a 66% season show-up rate.**

## 17. Registration and attendance per sport

**Stacked bar, one bar per sport: arrivals + no-shows, summing to
registrations.** Sorted by registrations, with the show-up rate labelled.

Deliberately **not** registered-beside-attended. Attendance is a *subset* of
registration, not a sibling category, so stacking those two double-counts and
overstates the total. Arrivals plus no-shows is a true part-to-whole, shows
the same comparison, and makes the gap the visible thing.

**Population: registrants only.** Corrected 2026-08-13. The numerator
originally counted *any* arrival while the denominator counted registrations,
so 84 walk-ins across the season were being credited against a whole they were
never part of — inflating every sport by three to five points, and on
2026-05-02 producing 28 Pickleball arrivals against 0 registrations. This is
the same population mismatch already fixed in the per-night show-up rate
(`lib/game-nights.ts`). With walk-ins excluded, arrivals plus no-shows sum to
registrations exactly and `noShow` can never go negative.

Measured, and the reason this chart earns its place:

| Sport | Registered | Came | Show-up |
|---|---|---|---|
| Pickleball | 795 | 533 | 67% |
| Badminton | 460 | 305 | 66% |
| Volleyball | 464 | 305 | 66% |
| Basketball | 473 | 300 | 63% |
| **Running** | **253** | **83** | **33%** |

Four sports sit within four points of each other. Running is half of them.
Two in three people who sign up to run do not come, and no other metric in
this app varies like that.

## 17b. Show-up by sport, night by night — added 2026-08-13

**Small multiples, one stacked area per sport: arrivals on the bottom,
no-shows above, summing to that night's registrations.** Same grid, legend and
count/share switch as the discipleship mix panel, so the two read as one
family. Ordered by show-up rate ascending rather than by size — the panel
exists to find the room that empties out, so the answer is the first facet.

Metric 17 says *which* sport empties out. This says *when*, and whether it is
getting worse. Running answers both: 33% all season, and its registrations
collapse from 23 a night in February to 5–8 by July.

Restricted to the 15 of 17 nights with a check-in file. A night with no file
has an unknown split; plotting it would draw every registrant as a no-show,
so a night the app never measured would render as the worst night of the
season — the same trap the discipleship capture gap fell into.

A sport with zero registrations on a night that *was* measured stays in the
series as a real zero: Pickleball did not run on 2026-05-02 or 2026-06-20.
In share mode those points break the ribbon rather than plotting 0%.

The top edge is deliberately flat: registration is slot-capped at ~30 a night
per sport (60 for Pickleball), so the whole signal is the boundary inside the
stack. That is the panel's argument — the room is always full on paper.

## 18. Present but unplaced

**Panel with a count and the top few, linking to a Players view.** People who
are **Seekers or Not involved** and have **attended** — not merely registered
— five or more nights.

**21 people qualify.** Michael Liu has attended 12 nights and is in no group;
Pat Ragguinan, Prince Del Castillo, and Joshua Buhay have 9 each.

This is the list the app was built to produce and could not until now. Every
prior "keeps coming" figure meant *keeps registering*, which the season's 66%
rate shows is a materially different claim.

## 19. Registered but rarely comes

**Panel with a count and the top few, linking to a Players view.** Ranked by
nights missed, among people with five or more registrations.

**A total zero is flagged inline as a possible matching failure, not
presented as a certain no-show.** Luijoy Gerlyn Ferrer shows 0 arrivals from 9
registrations — which is either a real pattern worth a pastoral conversation,
or a name the door list never resolved. The data cannot tell those apart, and
this table must not imply otherwise. Anyone with at least one recorded arrival
has proven their name matches, so only a total zero carries the flag.

## 20. Show-up rate over the season

**Two lines per game night: registered and came.** The gap between them is the
no-show, and the season figure (66%) sits alongside. Nights without a check-in
file are absent from the attendance line rather than plotted as zero — the
same rule as everywhere else, and the one that has already caused a real bug.

## 21. Most committed players — revised

The existing leaderboard ranks by **nights registered**. It becomes **nights
attended**, and the ordering changes: Michael Liu leads at 12, and he is Not
involved.

Columns: player name, nights attended, DGroup involvement, frequent sport.
Frequent sport is taken from `attended_sport` — what the door list recorded —
falling back to the registered sport, because what someone actually played is
the truer answer.

## Not doing yet

- **Repeat no-show follow-up tooling** beyond the count and list. Two nights
  still have no check-in file, and a pattern drawn from partial coverage would
  send someone to the wrong conversation.
- **Per-sport attendance over time.** The season totals answer the question;
  a fifteen-point series per sport is five more charts for a finding one table
  already delivers.

## 22–26. The operational rebuild — 2026-08-13

The page was restructured from a narrative report (Acts 1–4, seven prose
subtitles, longest 228 characters) into a view: **Numbers → Spine → Cuts →
Lists**, ordered by scan speed, season-to-date. Copy rule: title plus a
**≤6-word unit or population label**, only where its absence causes a silent
misread. Findings moved into the marks — "Running is the thinnest room" is now
a chip on the Running facet.

Panels went 14 → 12. The arrival ridgeline shipped and was cut the same day: it answered a door-staffing question nobody had asked. Removed: the "Show-up by sport" bar panel (every bar
already existed as the summary bar inside the night-by-night facets), the
PlacementGap prose panel (its figure joined the metric row), and the
returnee-vs-first-timer series (metric 22 answers the same question better).

### 22. Newcomer return rate — built and removed, 2026-08-13

Shipped as a per-month table (newcomers, share who returned, share who
attended 3+) and removed at the user's request the same day.

Worth recording because the measurement stands and the finding was real:
newcomer return ran 60% / 54% / 67% / 51% for Feb–May, then **25% in June and
30% in July**, on a June intake a third of normal. It was also the only one of
the four transitions leadership asked about that this data can measure end to
end, since first-to-returning needs no self-report.

If retention returns to the page, `getNewcomerRetention` is the shape to
rebuild: cohort keyed on first registration, two thresholds (returned at all,
attended 3+), and cohorts with fewer than two later nights marked *too new*
rather than plotted — the newest intake always looks like a collapse when its
denominator has not happened yet.

### 23. Leadership pipeline

**`"Are you planning to lead a DGroup soon?"`, over the 399 who answered.**

| | | |
|---|---|---|
| Ready to start now | 37 | 9% |
| Praying, 1–3 months | 89 | 22% |
| Planning next year | 159 | 40% |
| No plans yet | 114 | 29% |

A form field captured since the first upload and never surfaced anywhere.
**126 people are ready or nearly ready to lead**, with names attached.

This is a *stock*, not a flow: it says who is ready, not how many advanced.
That distinction is forced by the data — see the note below on why the
progression questions cannot be answered.

### 24. Who registers

**An age-by-gender pyramid over the whole roster, with the flatter splits
stated as figures.** Not sliced by nights attended: an attendance-banded
version shipped first and was replaced the same day. Cutting every demographic
by frequency asked the reader to hold four populations in mind before seeing a
single fact about the ministry, and three of the four cuts were flat anyway.

| Age | Men | Women | Share women |
|---|---|---|---|
| 18–24 | 134 | 59 | **31%** |
| 25–29 | 222 | 192 | 46% |
| 30–34 | 137 | 117 | 46% |
| 35–39 | 51 | 49 | 49% |
| 40+ | 25 | 22 | 47% |

**The skew is generational, not general.** From 25 up the ministry is 46–49%
women; at 18–24 it is 31%. A pyramid rather than paired bars because the
question is shape — whether it leans the same way at every age — and a mirror
on a shared axis answers that in one look.

Median age 28. Birth year from `raw["Birth Year"]` on 1,008 of 1,080, year
only: a birth month cannot make a five-year band more accurate and would
invite treating this as a birthday.

Secondary splits are figures, not charts — 87% single and 71% CCF do not earn
a plot. Workplace area is charted (Pasig 247, Quezon City 180, Taguig 116,
Manila 106, Makati 92, Mandaluyong 35, 205 elsewhere) because location is a
DGroup matching criterion, so the distribution is operational rather than
descriptive.

**Removed with the rebuild:** the finding that women fall from 49% of those
who never attended to 32% of 5+ regulars. It is real and measured, but it
answers a retention question, not a demographic one. If it returns it belongs
beside metric 22, not here.

### Why the pastors' progression questions are not on this page

Three of the four transitions leadership asked for — member→leader,
leader→absorber, not-involved→seeker — need people to re-answer the status
question on a later night. They do not, and it is getting worse:

| Night | Rows | With a point-in-time answer |
|---|---|---|
| 2026-02-28 | 177 | 69% |
| 2026-03-14 | 170 | 36% |
| 2026-05-02 | 173 | 20% |
| 2026-08-01 | 158 | **18%** |

That is why only 26 players ever changed an answer and 15 moved upward. **No
chart fixes this.** Metric 22 carries the one transition that needs no
self-report; metric 23 carries readiness as a stock.

**The fix is collection, not visualization.** If the registration form
re-asked returning players their DGroup status, a genuine progression measure
exists about three months later. Until then, the movement figure stays a chip
on the funnel with its denominator stated.

### 25. Commitment curve

**Columns, one per possible number of nights attended, including zero.**
373 players registered and never once walked in; 773 of 1,080 — 72% — came at
most once. Columns rather than an area: there is no such thing as 3.5 nights.

This carries the "is anyone progressing" story behaviourally, because the
self-reported version cannot. Only 26 players ever changed their discipleship
answer and 15 moved upward, since returning players almost never re-answer —
601 of 1,080 have any point-in-time answer at all. Movement stays a metric
panel with an honest denominator; a chart on 15 points would invent a trend.

### 26. Discipleship funnel

**Proportional bars on a shared scale, not a tapering funnel.** A funnel's
silhouette asserts everyone flows through the stages in order, and nobody
does — a DGroup member did not first pass through "seeking".

| Stage | Count | Share |
|---|---|---|
| **Not recorded** | **320** | **30%** |
| Not involved | 121 | 11% |
| Seeking a group | 48 | 4% |
| DGroup member | 404 | 37% |
| DGroup leader | 134 | 12% |
| D12 | 53 | 5% |

The unrecorded band is drawn first, hatched, and is the point of the chart as
much as any real stage. Dropping it would overstate every stage below and
imply the ministry knows where all of its people stand.

---

# 27–33. The question-led rebuild — 2026-08-14

Requested directly: keep the metric row, replace everything under it, and
answer seven named questions without a page so dense it invites misreading.

The panel set below is organised one panel per question rather than by
narrative act. Copy rule from the previous rebuild still holds: title plus a
**≤6-word unit or population label**, only where its absence causes a silent
misread.

**Panel set (8):**

| # | Panel | Answers |
|---|---|---|
| 27 | Matching market | can seekers be matched |
| 28 | Supply against demand | what leaders offer vs what seekers want |
| 29 | Who registers, by age | demographics with age as the root |
| 30 | Attendance by sport | registered vs attended, total + per sport |
| 31 | Discipleship mix by sport | segment composition, total + per sport |
| 32 | Where everyone stands + who moved | the funnel, and the movers named |
| 33 | Switchable roster table | returning / no-show / returning-but-unplaced |

Kept from the previous pass: the metric row (metric 24's grouped style) and
the leadership-intent pipeline (metric 23).

**Dropped:** the commitment curve and the registered-against-attended line
chart. The line chart is subsumed by metric 30's Total facet, which carries
the same comparison against a part-to-whole baseline.

## Two things this spec deliberately does not build

### Registrations and attendance are never stacked as two series

Requested as "stacked area of registrations vs attended". **Attendance is a
subset of registration, not a sibling of it**, so stacking the two counts every
arrival twice and overstates every night's total.

`attended + no-show = registered` carries identical information, is a true
part-to-whole, and makes the gap the visible thing. Metric 30 uses it. This is
the same decision recorded at metric 17 and is not revisited.

### "What factors most contribute to a seeker being absorbed" has no answer

A driver analysis needs an outcome variable — absorbed or not, per person,
over time. Absorption is not observable in this data (see below). Any model
fitted here would be reporting noise with a confidence interval attached.

The nearest honest substitute is the age cross-tab in metric 29, and it must
be labelled as **association, not cause**.

## Why movement still cannot be measured — third investigation

Three of the requested questions are transitions: seekers absorbed, leaders
becoming absorbers, members becoming leaders. All three need a person's status
observed at two points in time.

| Source | Coverage | Verdict |
|---|---|---|
| `Participations.dgroup_status` | 899 of 2,885 rows (31%), falling to 18% on recent nights | Only 26 people ever changed an answer; 15 moved upward |
| `Players.dgroup_status` | latest value only | No history — a stock |
| `raw["DGroup Leader Name"]` | 583 players | **450 are already Members, 0 are seekers or not-involved.** Perfectly correlated with status, and Players-level, so no history |

The leader-name field was investigated on 2026-08-14 specifically as a
candidate absorption signal and rejected on the numbers above. There is no
third source.

**The fix is collection, not visualization.** The registration form must
re-ask returning players their DGroup status. With that, a genuine flow
measure exists roughly three months later. Until then the dashboard reports
what it can see and says so.

## 27. Matching market

**Headline: how many seekers have at least one eligible leader, split by
gender, with the depth of choice underneath.**

Measured 2026-08-14 against `buildMatchBoard`:

| | Seekers | Matchable | |
|---|---|---|---|
| Total | 40 | **40** | 100% |
| Male | 22 | 22 | 100% |
| Female | 18 | 18 | 100% |

Candidates per seeker: min 1, **median 26**, max 68.

**The panel must not frame this as a yes/no question.** Every seeker is
matchable and most have dozens of options; the constraint is that nobody has
made the introduction. The headline is the abundance, and the candidate-depth
distribution is what makes it credible.

Gender is split because groups are not mixed — a surplus on one side cannot
cover a shortfall on the other, so a combined figure would be meaningless.

## 28. Supply against demand

**Four butterfly charts — leaders' offer mirrored against seekers' want, on a
shared axis, for day, time, setup and location.**

Populations: 184 leaders describing a group they run, 126 describing one they
plan to lead, 86 seekers describing what they want.

| Dimension | Leaders offer | Seekers want | Read |
|---|---|---|---|
| Day | Sunday 79 · Saturday 68 | Sunday 46 · Saturday 45 | near-proportional |
| Setup | F2F 94 · Hybrid 80 · Online 10 | F2F 44 · Hybrid 33 · Online 9 | near-proportional |
| Location | Pasig 99 · Metro Manila 42 | Pasig 26 · Metro Manila 17 | near-proportional |
| **Time** | 11am, 1pm, 8pm, 7pm | 10am, 6pm, 5pm, 3pm | **the one real gap** |

All four are drawn even though three show almost perfect overlap. **The
overlap is the finding** — it says three of the four constraints are not
constraints — and it is what makes the time mismatch legible by contrast. A
panel showing only the dimension that disagreed would leave a reader unable to
tell whether the others were checked.

**Times are Excel serial dates** (`1899-12-30T11:00:00.000Z`). The hour is
read off the string and **never timezone-converted**, the same rule that
governs `attendedAt` and every other time field in this system.

Age range is captured too but is free text on the seeker side — single ages
("23", "27") mixed with ranges. It is a matching input, not a chart.

## 29. Who registers, by age

**Age-by-gender pyramid as the root, with a cross-tab strip beneath: for each
band, the share who are women, single, CCF, and not in a group.**

| Age | n | Women | Single | CCF | Leaders | **Not in a group** |
|---|---|---|---|---|---|---|
| 18–24 | 193 | **31%** | 100% | 70% | 12% | **55%** |
| 25–29 | 414 | 46% | 97% | 76% | 14% | 44% |
| 30–34 | 254 | 46% | 91% | 80% | 26% | 33% |
| 35–39 | 100 | 49% | 88% | 83% | 32% | **28%** |
| 40+ | 47 | 47% | 55% | 68% | 17% | 40% |

Two findings, both monotonic across the middle bands:

1. **Involvement climbs with age.** Not-in-a-group falls 55% → 28%; leaders
   rise 12% → 32%.
2. **18–24 is the outlier on every axis** — most male (69%), least discipled,
   and the second-largest band. It is the clearest untapped population the
   ministry has.

Association, not cause. Nothing here says age *makes* someone join a group.

Age from `raw["Birth Year"]` on 1,008 of 1,080, year only — a birth month
cannot make a five-year band more accurate and invites treating this as a
birthday.

## 30. Attendance by sport — Total facet added

Metric 17b, extended with a **Total facet drawn first, then sports
alphabetically**. Bands stay `attended + no-show = registered`; population
stays registrants only, over the nights with a check-in file.

Alphabetical rather than ranked so this panel and metric 31 can be read
against each other position by position. The worst-performing sport keeps its
chip rather than being promoted to first place.

## 31. Discipleship mix by sport — Total facet added

Metric 15, extended with the same Total-first, then-alphabetical ordering.

**Coverage label is mandatory.** Point-in-time answers cover 31% of
participations, so the historical composition is substantially today's status
painted backwards. The panel must say so; see "Point-in-time versus current
status" above.

## 32. Where everyone stands, and who moved

The funnel (metric 26, unchanged) with the **15 movers named beside it** —
who moved, from what to what, and when.

At n = 15, a list is the honest form. A chart would imply a distribution and a
trend that fifteen points cannot support. The named list is also the more
actionable artifact: those are people to follow up with.

The panel carries one line naming why the number is small and what would fix
it, per the collection note above.

## 33. Switchable roster table

One table, three views, switched in place:

| View | Ranking | Purpose |
|---|---|---|
| Returning players | nights attended, descending | who the regulars are |
| No-shows | registrations without an arrival, descending | who signs up and does not come |
| Returning but unplaced | nights attended, filtered to Seekers + Not involved | the warmest conversations available |

One table rather than three panels: the columns are identical and only the
ranking and filter change, so three panels would be the same table printed
three times.

Attendance-derived views are restricted to nights with a check-in file and
must say so.
