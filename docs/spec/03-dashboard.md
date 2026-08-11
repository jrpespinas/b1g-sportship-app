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
