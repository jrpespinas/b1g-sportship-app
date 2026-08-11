# Backfill: rebuilding the estate with point-in-time status

> **Status: procedure ready, not yet run.** Written 2026-08-11. Run it when
> you have the 17 exports to hand and roughly an hour.

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
| Batched row update, one API call not one per player | `lib/sheets.ts` (`updateRows`) |
| Duplicate game-night guard | `app/upload/actions.ts` (`commitBatch`), `components/upload/upload-flow.tsx` |
| Honest fallback when a night has no stored status | `lib/dgroup.ts` (`resolveParticipationSegment`) |

Identity fields — first name, last name, email — are deliberately **never**
refreshed. Those are what dedup matches on; letting a typo in a later export
rewrite them would silently split or merge real people. A blank answer on a
later form is treated as "no new information", never as an erasure.

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
- Participations: close to 2801, every row carrying `dgroup_status`.
- The dashboard's orange "segment history is inferred" banner **disappears**,
  because all 17 nights now carry their own answers.

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
