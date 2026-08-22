# Attendance — who actually came

## Why this exists

Registering and turning up are different events, and until 2026-08-12 this app
treated them as one. Measured against the 2026-05-30 door check-in list:

| | |
|---|---|
| Registered | **183** |
| Checked in | **131** (120 unique, 11 duplicate taps) |
| Registered **and** came | **103** |
| Registered, no-show | **80 — 44% of registrations** |
| Came without registering | 4 |
| **Show-up rate** | **56%** |

Every figure the app called attendance was really registration, overstating
turnout by nearly a factor of two. `Participations` was even documented as
"the attendance history". Both are corrected.

## The two files are not alike

Registration is an 80-column Google Forms export keyed by email. Attendance is
**two columns** — `Timestamp` and `Attendance` — where the whole identity is
one string:

```
2026-05-30T17:33:24.424Z    Embile, Jack 🏐
```

Surname-first, plus a sport emoji. No email, no separate name fields.

## Consequences of that shape

**Matching runs on name.** There is no email, so the primary dedup key is
unavailable. The file happens to arrive in exactly the form `lib/fuzzy.ts`
normalises to — `"Last, First"` — so exact comparison does most of the work:
**107 of 120 unique check-ins auto-match, 89%.** The other 13 are typos
(`Besmknte`), stray spacing (`Gatpolintan , Hannah Marie`), suffixes
(`Zosimo Jr`) and nicknames (`Cuello, JL`), and they go to the review queue.
Nothing is auto-linked on similarity: without an email there is no second
signal to catch a wrong link, and a wrong link marks the wrong person present.

**Duplicates are collapsed first**, keeping the earliest tap — that is the
arrival, and a second tap is the same arrival recorded twice.

**The check-in time is kept whole.** Arrivals spread from 5:33pm to 8:28pm,
peaking 5–6pm with a tail, and that curve is worth charting. **Never
timezone-convert it**: the hour as written is the local hour, the same rule the
DGroup time fields follow. Read as UTC, a 5:33pm check-in becomes 1:33am.

## What gets written

`Participations` gains `attended_at`, `attended_sport`, and `registered`.
Rows written before this existed all came from registration files, so a blank
`registered` reads as TRUE rather than as a walk-in.

`Game Nights` gains `attendance_uploaded_at`, `attendance_source_filename`,
and `attendance_count`. **That group is load-bearing, not bookkeeping:**
without it there is no way to distinguish "we have the file and 80 people did
not come" from "we have no file for this night". A night with no check-in file
must never render as nobody attending — the same trap the discipleship
capture-gap fell into, which produced a real bug.

## Two doors, one store — added 2026-08-17

Attendance arrives either as an uploaded `.xlsx` or by **linking the Google
Sheet the door form writes into**. Both run the same parse, the same matching,
the same review queue, and land in the same place. This is a second way in,
not a second store: two stores would be the shape of bug that produced two
segmentation rules and two definitions of "seeker".

The link is **per game night**, held in `Game Nights.attendance_sheet_url`
beside `attendance_source_filename` — together they say which door a night
came through.

**Rows are filtered by the night's date even though the link is per-night.** A
Google Form writes every response into one accumulating tab, so a link pasted
for two nights would otherwise import the whole season into both. Per-night
links are the interface; the date filter is the safety net. A sheet with no
`Timestamp` column is taken whole, which is the other real shape — a tab built
for one night.

The timestamp is compared **as written**, never parsed into a `Date`. Verified:
a 17:33 check-in stays 17:33.

The file path stays. It is how the earlier nights get backfilled, and what
still works when a sheet is unreachable.

### Re-importing

The hard "already uploaded" block becomes a confirmation. `commitAttendance`
matches on `(game_night_id, player_id)` and updates the row it finds, so
re-reading a sheet someone has since corrected replaces rows rather than
adding a second copy. It must never happen by accident, so it takes an
explicit click.

### Attaching is not importing — added 2026-08-17

Three moments, deliberately separate: **attach** the link on the night's own
page, **watch** it fill during the night, **import** once the night is over.

Collapsing them is what made a live sheet impossible to set up. The only way
to attach a link was to import it, the import refuses an empty sheet, and a
sheet attached before the doors open is always empty — so there was no way to
say "remember this link, I will import it later".

`/game-nights/[id]` carries the panel. Attaching is admin-only (it writes);
reading the count is viewer-level, because watching the door fill is not a
write. Saving validates immediately, so an unshared or wrong-shaped sheet
fails on the day you paste it rather than at 7pm on the night you need it.

**A link writes only `attendance_sheet_url`.** `attendance_uploaded_at` stays
empty, so a night with a link and no import is still, correctly, a night with
no check-in list — it stays out of every show-up calculation. Verified with a
real link attached to a live night: the dashboard continued to read *16 of 19
nights* and a 62% season rate, untouched.

Refresh is a button that states the time it read, never a timer. A stale
number must not be able to pass itself off as live, and polling would spend
the per-minute read quota all evening for a page nobody is looking at.

### An empty import is refused

A sheet read before the doors open has no rows, and committing it would set
`attendance_uploaded_at` with a count of zero — after which the night reads as
*"we have the list and nobody came"*, which is precisely what that flag exists
to prevent, and is unrecoverable without editing the Sheet by hand. Refused in
the UI and again in `commitAttendance`. Found the first time the real door
sheet was read, an hour before its own game night.

### Failures the admin sees

Each names its own fix, because the two that actually happen — a sheet not
shared with the service account, and a URL pointing at nothing — are
indistinguishable in Google's raw error and need completely different actions.
`bad-url`, `not-shared`, `not-found`, `no-such-tab`, `wrong-shape`,
`no-game-night`.

## Rules the upload enforces

- **Attendance never creates a game night.** It attaches to one registration
  already established, because without that night's registrations there is
  nobody to match a bare name against. Uploading attendance for a date with no
  game night is refused, with that explanation.
- **Re-uploading a night that already has attendance is blocked**, the same
  guard registration uses for a duplicate date.
- **Walk-ins go to review as possible new people**, not silently into a tally.

## The night's roster is sortable and filterable — added 2026-08-17

`/game-nights/[id]` renders the roster as an interactive table: sort by player,
sport, arrival time or first-timer status, and filter by attendance status
(came · did not come · walked in), sport, first-timers, or a name search.

Two rules the table encodes:

- **Someone who never arrived sorts last in both directions.** They have no
  place on a time axis, and letting the flip carry them to the top would put
  fifty-seven no-shows above the arrivals on "latest first".
- **The attendance filters only appear once a check-in list exists.** Without
  one, "did not come" would silently return the entire roster.

Rows are projected to the four columns the table draws before crossing to the
client. `Player.raw` is the whole 80-column form response and a night holds up
to 180 people, so passing the objects through would put megabytes into the page
— and would ship every member's contact details to render four columns.

## Backfill

Check-in files exist for the other nights. Backfilling them turns the show-up
rate into a season trend and makes "who keeps registering but never comes" an
answerable question — a genuinely different follow-up list from anything the
app produces today. Measure a second file before designing on top of it: one
night is not a pattern.
