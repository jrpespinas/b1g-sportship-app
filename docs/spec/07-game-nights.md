# Game Nights — the season's ledger and record

## Why this exists

`Game Nights` has been a join key since [01-data-model.md](01-data-model.md)
and nothing has ever shown it to a person. Two things changed that:

**Attendance made a night a two-part thing.** A night now needs *two* files —
the registration export and the door check-in list — and there is currently no
way to see which nights have which. As of 2026-08-13 that is **0 of 17 nights
with attendance**, and the only way to know was to query the Sheet.

**The per-night record answers questions the dashboard flattens.** The
dashboard reports the season; this reports a night. "What happened on May 2"
is not a question a season-wide chart answers.

## The two jobs, in order

### 1. Ledger — what still needs uploading

The urgent job while backfilling. For every night: does registration exist,
does attendance exist, and what is missing. This recedes once the backfill is
done and should not be designed as though it is permanent.

### 2. Record — what happened that night

The enduring job. Registered, came, show-up rate, first-timers against
returnees, sport mix, and how much review the upload needed.

## The list

One row per game night, most recent first. Every field is either a `Game
Nights` column or derived from that night's `Participations`.

| Column | Source | Notes |
|---|---|---|
| Date | `game_night_date` | Admin-entered at upload, not derived from row timestamps |
| Registered | count of `Participations` | What the app used to miscall attendance |
| Came | rows with `attended_at` | Blank when no check-in file exists — **never zero** |
| Show-up rate | came ÷ registered | Only shown when a check-in file exists |
| First-timers | `is_first_participation` | Falls 177 → 35 across the season, as expected |
| Sports | distinct `sport_selected` | Count, with the mix on the detail page |
| Review | `flagged_count` | Rises 0 → 12 as the roster grows and names collide |
| Files | `source_filename`, `attendance_source_filename` | Which two files produced this night |

**A night with no check-in file must render as "not uploaded", never as zero
attendance.** This is the same rule as the discipleship capture gap, and it
has already produced one real bug in this codebase. Blank and zero are
different facts.

**Anomalies get explained, not hidden.** May 2 (105 registered) and Jun 20
(108) sit far below the ~175 norm, and both are the only nights with **no
Pickleball** — the dominant sport at ~60 players everywhere else. A row that
looks like bad data but is not should say so.

## The detail page

`/game-nights/[id]`. Carries what will not fit in a row:

- **Arrival curve.** Check-in times bucketed by hour. On 2026-05-30 arrivals
  ran 5:33pm–8:28pm, peaking 5–6pm with a late tail. `attended_at` is stored
  at full precision for exactly this. **Never timezone-convert it** — the hour
  as written is the local hour ([06-attendance.md](06-attendance.md)).
- **Sport breakdown**, registered against came, once attendance exists.
- **First-timers and returnees** for that night.
- **Who did not come** — see below.
- **Walk-ins**, if any: checked in with no registration.
- **Upload provenance**: both filenames, who uploaded, when, and how many rows
  needed review.

## No-shows

New information, and genuinely actionable — but only once there is data.
Phased against what is computable:

1. **Now: the count.** Per night, with the roster available on the detail
   page. Nothing else is honest while 0 nights have attendance.
2. **Once a few nights have check-in files: export.** CSV of who registered
   and did not come, consistent with every other worklist in this app.
   [02-player-inventory.md](02-player-inventory.md) governs the PII rule.
3. **Once several nights exist: repeat no-shows.** Someone who registers every
   week and never comes is a different conversation from a one-off absence.
   This cannot be computed from one night and must not be shipped as though a
   single absence means anything.

## Not in scope

- **No editing.** Same read-only boundary as everywhere else — correct a night
  by re-uploading, not by typing here.
- **No deleting a game night.** Destructive operations stay in
  `scripts/`, where they carry backup and confirmation guardrails
  (`reset-attendance.mjs`).
- **No upload from this page.** Uploading lives at `/upload`; this page links
  there. One flow, one place.
- **No new charts beyond the arrival curve.** Season-wide trends belong on the
  dashboard, which already carries them.

## Open

- **Does the ledger stay once the backfill is done?** It could recede to a
  single line rather than occupy the top of the page. Worth revisiting when
  17 of 17 are complete rather than deciding now.
- **Should a night with a suspicious registration count be flagged
  automatically?** May 2 and Jun 20 are explainable, but a rule that flags
  them would need to distinguish "a sport did not run" from "a partial file
  was uploaded", and only the second is a problem.
