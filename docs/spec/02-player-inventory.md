# Player Inventory — Admin Surface

Admin-only (see [04-access-control.md](04-access-control.md)). Owns ingestion,
dedup resolution, and browsing `Players` and `Participations`, both defined in
[01-data-model.md](01-data-model.md). Does not include a record-edit form — see
the non-goals in [00-overview.md](00-overview.md).

## Feature 1: Upload

- Admin selects an `.xlsx` file (one game night's roster, ~150–200 rows) and
  confirms the `game_night_date` for this batch (defaults to today — see
  [01-data-model.md](01-data-model.md) `Game Nights` for why this can't be
  derived from row timestamps).
- Server-side parse (credentials for the Sheets write live server-side only —
  see `PRODUCT.md` Stack). Map columns to `Players`/`Participations` fields
  per [01-data-model.md](01-data-model.md).
- **Required-field validation:** a row missing both a usable email (`Email
  Address` and `Email Address 2` both blank) and a name (`First Name` +
  `Last Name` both blank) cannot be identified — reject it into an "unusable
  rows" list shown in the upload summary, not silently dropped and not
  written to the sheet.
- **Within-batch duplicate check, before history matching:** if the same
  normalized email appears more than once *within this same file* (accidental
  double form submission for one game night), collapse to a single row before
  matching against history — otherwise one person attending once could log two
  `Participations` rows for the same game night and inflate every count.
- Every remaining row proceeds to history matching.

## Feature 2: History matching

Run against the existing `Players` tab for every valid, de-duplicated-within-
batch row:

1. **Exact match** on normalized email → this is a known player back for
   another game night. **Auto-confirmed, no review needed:** insert a new
   `Participations` row linking to the existing `player_id`. `Players` identity
   fields are left untouched — a routine returning-player match is not licence
   to silently overwrite someone's stored contact info (if it visibly changed,
   that's a `Players`-editing concern, out of scope per
   [00-overview.md](00-overview.md) non-goals, not something this flow does
   automatically).
2. **No email match, but fuzzy name match** (normalized `last, first`
   similarity above threshold) → genuinely ambiguous, routed to review. This is
   the case that catches a typo'd email or a second address for the same
   person — a human has to decide, an algorithm can't.
3. **No match at all** → new person. Auto-inserted: new `Players` row +
   `Participations` row (`is_first_participation = true`), no review needed.

Only case 2 produces review-queue work. At typical weekly volume this should be
a small fraction of the batch, not most of it — most weeks are mostly known
players returning, and that's the case explicitly designed to need zero admin
attention.

Fuzzy-match threshold is a tuning knob, not a hard spec requirement — start
conservative (fewer false positives; missing a real duplicate occasionally is
recoverable, since a human still owns the data) and adjust based on how noisy
real weekly uploads turn out to be.

## Feature 3: Review queue

For every fuzzy-matched row: show the incoming submission next to the matched
`Players` candidate(s), with per-field differences visually called out. If more
than one candidate matched, show all of them; the admin picks which one it's
referring to (or none).

Per row, the admin picks exactly one:

- **Link to existing player** — this is the matched person. Insert a
  `Participations` row against the existing `player_id`. Optionally, the admin
  may choose to also update the stored email to the new one (the one concrete
  identity-field change this flow does allow, since it's the specific thing
  that caused the ambiguity in the first place).
- **Add as new player** — a different person despite the name similarity
  (e.g. two family members). Insert a new `Players` row + a first
  `Participations` row.
- **Skip** — discard the incoming row entirely (e.g. it turns out to be a
  data-entry error, not a real registrant).

Nothing in the flagged set writes until the admin has resolved every row in
that batch's queue (partial-batch commits would leave the sheet in an
ambiguous state mid-review).

## Feature 4: Batch summary

After a batch is fully resolved, write one row to `Game Nights`
([01-data-model.md](01-data-model.md)) and show the admin a summary: rows in
file, unusable rows rejected, within-batch duplicates collapsed, auto-confirmed
count (returning + brand-new), flagged count, and the review-queue outcome
breakdown.

## Feature 5: Browse & search

`Players` will grow into the hundreds/low thousands over a season — needs to be
searchable, not just scrollable.

- Search by name or email.
- Filter by: DGroup status, church affiliation, life stage (derivable from
  civil status), age bracket (derivable from birth year).
- Table view with high-signal columns (name, email, DGroup status, # game
  nights attended); full record on demand.

## Feature 6: Player detail view

Full `Players` record, plus their complete `Participations` history — every
game night attended, sport picked each time, and which was their first. This
view is the natural place an admin would look up "has this person played
before, and what," and it's what the dashboard's "top returning players and
frequent sports" tile ([03-dashboard.md](03-dashboard.md)) aggregates across
all players. Read-only; use the Sheet directly or a future edit feature to
correct data, per the non-goals.
