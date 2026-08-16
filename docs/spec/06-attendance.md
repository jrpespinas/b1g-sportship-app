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

## Rules the upload enforces

- **Attendance never creates a game night.** It attaches to one registration
  already established, because without that night's registrations there is
  nobody to match a bare name against. Uploading attendance for a date with no
  game night is refused, with that explanation.
- **Re-uploading a night that already has attendance is blocked**, the same
  guard registration uses for a duplicate date.
- **Walk-ins go to review as possible new people**, not silently into a tally.

## Backfill

Check-in files exist for the other nights. Backfilling them turns the show-up
rate into a season trend and makes "who keeps registering but never comes" an
answerable question — a genuinely different follow-up list from anything the
app produces today. Measure a second file before designing on top of it: one
night is not a pattern.
