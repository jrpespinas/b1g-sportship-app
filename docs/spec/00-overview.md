# B1G Sportship — Spec Overview

Spec-driven reference for implementation. Each file below is scoped to one concern
so it can be loaded independently — don't pull the whole spec folder into context
for a change scoped to one area.

## Documents

| File | Covers |
|---|---|
| [01-data-model.md](01-data-model.md) | The Google Sheet as system of record: `Players`, `Game Nights`, and `Participations` tabs, full field list, types, dedup keys. |
| [02-player-inventory.md](02-player-inventory.md) | Admin surface: weekly Excel upload, history matching, review queue, browse/search. |
| [03-dashboard.md](03-dashboard.md) | Pastor/volunteer surface: metrics, breakdowns, refresh strategy. Attendance metrics added 2026-08-13. |
| [04-access-control.md](04-access-control.md) | The two shared-credential gates and what they guard. |
| [05-backfill.md](05-backfill.md) | The 2026-08-11 re-upload that fixed point-in-time discipleship status. Run and verified; kept as a record. |
| [06-attendance.md](06-attendance.md) | The door check-in list: why registering and attending are different events, and how a bare name is matched without an email. |
| [07-game-nights.md](07-game-nights.md) | The season ledger and per-night record: which nights have which files, and what happened on each. |

See `/PRODUCT.md` at the repo root for product-level truth (users, positioning,
principles) that this spec set implements. This overview and the files it indexes
own the technical/functional spec; PRODUCT.md owns the "why."

## How the app is used, week to week

1. B1G Sportship runs an ongoing Google Form. Responses accumulate continuously.
   Each weekly export is one game night's roster (confirmed by the sample
   filename itself: `...July 25 - Game Night Registration...`), not a
   cumulative dump — so each upload becomes one `Game Nights` row.
2. Roughly weekly, an admin exports that game night's Form responses
   (~150–200 rows) as an `.xlsx`, confirms the game night date, and uploads it
   through the Player Inventory surface.
3. Each row is matched against `Players` history. A returning player (exact
   email match) or a brand-new player (no match at all) is auto-confirmed —
   no review needed, that's the common case. Only a genuinely ambiguous row
   (name looks similar to an existing player, but no email match) is queued
   for the admin to resolve by hand — see
   [02-player-inventory.md](02-player-inventory.md).
4. Every confirmed row writes a `Participations` row (append-only — a
   person's attendance history is never overwritten) and the batch is logged
   in `Game Nights`, both in [01-data-model.md](01-data-model.md), so counts
   are always explainable.
5. The dashboard reads live off `Players` and `Participations` and needs no
   separate refresh step from the upload — see
   [03-dashboard.md](03-dashboard.md). Its metric list is what drove
   `Participations` existing as an append-only table in the first place:
   weekly counts, per-game-night time series, and returning-player sport
   frequency are all impossible against a model that only remembers the
   latest state per person.

## Non-goals (explicitly out of scope)

- **Event-day check-in.** `Participations` records who *registered* for a
  game night, not who physically *showed up* — those are different facts, and
  only the first is modeled. No check-in mechanism exists. Parked for a
  future spec if it becomes needed.
- **In-app record editing.** Admins correct a bad row either by re-uploading
  (which flows through the same matching/review) or by hand-editing the Google
  Sheet directly — the app does not ship a standalone edit form in v1. Revisit
  if this proves painful in practice.
- **Per-person accounts.** Access is two shared credentials (viewer, admin), not
  individual logins. See [04-access-control.md](04-access-control.md).
- **Partial/field-level merge in the review queue.** A flagged duplicate
  resolves as skip / link-to-existing-player / add-as-new — never a
  field-by-field merge of `Players` data. Keeps the review queue fast to
  operate weekly at this volume.
