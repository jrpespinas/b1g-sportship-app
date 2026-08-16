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
3. **No email match, but same mobile number *and* same surname** → also routed
   to review. Added 2026-08-13, after the roster showed a class of duplicate
   that spelling cannot reach: `Sabugo, Jm` scores 0.77 against
   `Sabugo, Jomar`, and `Diaz, Glai` scores 0.83 against `Diaz, Glaiza` — both
   under the threshold, and both sitting in the roster as two people.
   Comparison is on the **last ten digits**, because the same phone is written
   three ways in the data (`09…` 281 times, `639…` 692, bare `9…` 29).
4. **No match at all** → new person. Auto-inserted: new `Players` row +
   `Participations` row (`is_first_participation = true`), no review needed.

**Why surname guards the mobile rule.** Nine numbers in the roster are shared
by more than one player. All three of the pairs with *different* surnames are
couples and housemates passing one handset around — real, distinct people. All
six same-surname pairs are either duplicates or siblings, which is precisely
the judgment a review card exists to collect. The guard therefore costs
nothing and removes every measured false positive.

Cases 2 and 3 produce review-queue work. Across the first 17 nights that was
104 cards on 2,806 rows (~6 per upload), of which 99 were confirmed as the same
person — a small fraction of the batch, as intended, and overwhelmingly a
confirm rather than a decision. Adding case 3 would have surfaced six more.

Fuzzy-match threshold is a tuning knob, not a hard spec requirement — start
conservative (fewer false positives; missing a real duplicate occasionally is
recoverable, since a human still owns the data) and adjust based on how noisy
real weekly uploads turn out to be. The mobile rule is deliberately **not** a
tuning knob: it is exact-match or nothing, since a fuzzy phone number matches
strangers.

## Feature 3: Review queue

For every flagged row: show the incoming submission next to the matched
`Players` candidate(s), with per-field differences visually called out. If more
than one candidate matched, show all of them; the admin picks which one it's
referring to (or none).

Each candidate carries its **evidence**, in the same met/failed/unknown
vocabulary the attendance queue uses:

- **Mobile number**, as a verdict rather than two strings to diff, masked to
  the last four. 1,007 of 1,080 players carry one and 998 of those are
  distinct, so agreement is very nearly proof. Three states, never two — an
  absent phone must never read as a phone that disagreed.
- **Nickname**, which is often better evidence than the spelling of a legal
  first name.
- **Church affiliation**, the one remaining answer both records always hold.
- **History**: nights registered, nights actually checked in at the door, last
  seen, usual sport. Registered and came are held apart because they differ by
  a third across the season, and a candidate with a single stray registration
  is usually itself the mis-keyed duplicate.

A candidate whose phone matches is ranked first and ringed, because the
matcher already knows it is the near-certain one.

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
