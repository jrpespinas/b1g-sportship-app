# Backfill: rebuilding the estate with point-in-time status

> **Status: run and verified, 2026-08-11.** All 17 exports were re-uploaded
> through `/upload`. Results against the pre-reset baseline:
>
> | | Before | After |
> |---|---|---|
> | Game nights | 17 | **17** — Feb 28 → Aug 1, correctly dated, no duplicates |
> | Players | 1081 | **1080** (−1, within the expected fuzzy-match variance) |
> | Participations | 2801 | **2801** — exact match |
>
> **Do not run the reset script again on the strength of this document.** The
> procedure below is kept as a record of what was done and as a template if a
> second correction ever becomes necessary. It is destructive, and the estate
> it would clear is now correct.

## Why this exists

Two defects, found 2026-08-11, made every discipleship figure in the app a
record of *first contact* rather than *current standing*.

**1. Player records were never updated.** `commitBatchToSheets` only ever
appended. Verified against the live Sheet: **1081 of 1081** players had
`first_seen_at === last_updated_at`. Not one record had ever changed. 526 of
those players had attended two or more game nights, re-submitting the form
with fresh answers every time, and each of those answers was discarded.

So "398 DGroup members" meant *"398 people who were members the first time we
met them."* Someone who joined a group in March still read as "Not involved"
in August. The follow-up lists built on that were wrong in the direction that
wastes the most time: you would go and ask someone to join a group they had
already been in for five months.

**2. Per-night status was parsed and thrown away.** `IncomingRow` reads
`dgroupStatus`, `dgroupInterestedInJoining`, and
`dgroupLeadingWillingToAbsorb` from every row of every upload.
`PARTICIPATION_HEADERS` stored none of them. Nothing recorded what a person's
standing was *on the night they came*, so a "discipleship mix over time"
chart could only paint today's status backwards across the whole season —
which manufactures a trend out of nothing.

Both are fixed in code. The data still carries the damage, and only a
re-upload can undo that.

## What changed in code

| Change | File |
|---|---|
| Point-in-time status persisted per attendance | `lib/types.ts`, `lib/store.ts` (`PARTICIPATION_HEADERS` + mappers) |
| Returning players' records refreshed in place | `app/upload/actions.ts` (`refreshedPlayer`) |
| The refresh is chronology-gated, not upload-order-gated | `app/upload/actions.ts` (`latestKnownDateByPlayerId` in `commitBatch`) |
| Batched row update, one API call not one per player | `lib/sheets.ts` (`updateRows`) |
| Duplicate game-night guard | `app/upload/actions.ts` (`commitBatch`), `components/upload/upload-flow.tsx` |
| Honest fallback when a night has no stored status | `lib/dgroup.ts` (`resolveParticipationSegment`) |

Identity fields — first name, last name, email — are deliberately **never**
refreshed. Those are what dedup matches on; letting a typo in a later export
rewrite them would silently split or merge real people. A blank answer on a
later form is treated as "no new information", never as an erasure.

**Why "chronology-gated, not upload-order-gated" matters for this exact
procedure.** If a night gets uploaded out of order — discovered late, or
redone after a mistake — a naive "last upload wins" refresh would treat that
older night's answers as new information and overwrite a status a
later-dated night had already corrected. `commitBatch` instead computes each
player's latest *game night date* already on record (from their
`Participations` rows, not from upload order) and only refreshes the Player
snapshot when the incoming night is that date or later. The Participation row
itself is always written regardless — only the "current status" snapshot is
gated. Found and fixed 2026-08-11, mid-backfill, when a missed night (Apr 25)
needed uploading last, after 16 later nights were already in.

## Why a full reset rather than re-uploading one night at a time

Dedup keys off the Players tab. Re-uploading Feb 28 while the 1081 players
still exist would match every single person as *returning*, so
`isFirstParticipation` would be false for the entire season and the
first-timer series would flatline at zero. Clearing first lets the dedup
replay exactly as it did the first time: Feb 28 creates players, every later
night matches them.

## The procedure

Roughly an hour, mostly waiting on uploads. Do it in one sitting — a
half-finished estate is worse than either end state.

**1. Take a backup.** Not optional; the reset script refuses to run without
one from today.

```bash
node scripts/backup-sheet.mjs
```

Writes `backups/<timestamp>/` with both JSON (exact, restorable) and CSV
(openable) copies of all three tabs. `backups/` is gitignored — it holds real
names, emails, and phone numbers.

**2. Gather the 17 exports.** They are the Google Form response files listed
in the Game Nights tab's `source_filename` column, Feb 28 through Aug 1. Only
July 25 is in the repo, and it should not be — roster files are PII and
`/*.xlsx` is gitignored. Download them from Drive to somewhere local.

**3. Clear the estate.**

```bash
node scripts/reset-sheet.mjs --confirm
```

Refuses without `--confirm`, without a backup from today, and if any header in
the script has drifted from `lib/store.ts`.

**4. Re-upload all 17 through `/upload`, oldest first.** Order matters —
first-timer flags and `first_seen_at` are both assigned in upload order, so
Feb 28 must go first and Aug 1 last.

Set the game-night date to the **date of the session**, not today. Resolve the
fuzzy-match review queue as it appears, exactly as you did originally.

**5. Verify.**

```bash
node scripts/backup-sheet.mjs   # a second snapshot, for comparison
```

Expected afterwards:

- Game Nights: **17** rows, one per date, no duplicates.
- Players: close to 1081. An exact match is not expected and not a problem —
  fuzzy-match decisions are judgement calls and may land differently on a
  replay. A large gap (say under 1000 or over 1150) means something went
  wrong; restore from the backup and stop.
- Participations: close to 2801, each row carrying whatever `dgroup_status`
  that person actually gave that night — **which is not all of them.** See
  below.

### What "full coverage" actually looks like — corrected 2026-08-12

An earlier draft of this section expected *every* row to carry a
`dgroup_status`, and expected the dashboard's orange banner to disappear on
that basis. Both were wrong, and the mistake is worth recording because it
produced a real bug.

Measured after the backfill, point-in-time coverage runs from **85% on Feb 28
down to 26% on Aug 1**, and no night reaches 100%. Split by first-timer versus
returnee, the cause is plain: first-timers sit at 60–85%, returnees at 16–36%.

That is not a parsing failure. `lib/column-map.ts` resolves every field by
header text, not column position, so drift between files cannot do this. The
real reason is the form itself: someone who says it is not their first time
registering can skip the discipleship questions and keep the answers they gave
before. Most returnees do exactly that. **A blank here means "no change
reported", not "data lost"** — and the dashboard already handles it correctly
by falling back to that person's latest known status
(`resolveParticipationSegment`).

So there are two different situations, and only one is a defect:

1. **A capture gap** — the app dropped an answer it was given. This is what
   the backfill fixed, and what the dashboard still warns about.
2. **A skipped question** — the person chose not to re-answer. Normal,
   permanent, and expected on every future upload too.

The dashboard's banner originally fired on both, which meant it could never
switch off and its explanation named the wrong cause. It now fires only on
nights with attendees and *zero* captured answers (`getCaptureGaps`) — a real
pipeline failure, since first-timers are always asked and cannot skip.
Verified silent as of 2026-08-12.

## What you get

The banner going away is the visible signal, but the substance is:

- **Every follow-up list becomes current.** A member who became a leader in
  June reads as a leader.
- **The mix-over-time charts become measurements.** Today they show today's
  status projected backwards; afterwards they show what was actually true on
  each night, so "are we moving people along the pipeline" becomes a question
  the dashboard can answer rather than one it appears to answer.
- **Every future upload keeps itself current** — this is a one-time
  correction, not a recurring chore.

## If it goes wrong

Restore from `backups/<timestamp>/*.json`: each file is the exact
`values` array for its tab, header row included. Clear the tab and paste it
back. Nothing else in the app holds state, so a restored Sheet is a fully
restored app.
