---
version: 1
slug: "player-inventory-upload"
primary_target: "player-inventory-upload"
related_targets: []
---

## Job and audience

Admin, alone, uploads one game night's roster (~150–200 rows) roughly weekly.
Device/moment isn't fixed — design seriously for both a deliberate laptop
session and a quick phone pass, not one as primary. Operate mode: the task
wins over expression at every point.

## Outcome and proof

Primary task: get this week's roster into `Players`/`Participations`
correctly with minimal friction, and be confident nothing wrote silently that
shouldn't have. Success = the common case (returning or brand-new player)
requires zero decisions from the admin; only genuine ambiguity asks for one.
Proof this isn't generic CRUD: the review queue is deliberately small most
weeks — its existence is evidence of real matching logic underneath, not a
rubber-stamp step.

## Selected direction

Canon, not an invented concept — user-pinned. Fused craft bar: Linear's
snappy, deliberate micro-interactions (especially for the triage step) +
Notion/Things 3's calm, content-first, minimal-chrome single-item focus +
Apple Health's native system chrome, generous whitespace, restrained motion,
card-based data presentation.

- Color: Restrained. White/clean ground as the overwhelming majority,
  `#FF6F2F` as the one accent — reserved for primary actions and key state
  (e.g. "this row needs a decision"), never decorative.
- Type: system stack (SF Pro / `-apple-system` and platform equivalents).
- Register: neutral efficient utility — no ministry/warmth styling in this
  chrome.
- Recorded as a standing brand commitment in `PRODUCT.md`, governing this
  surface and, by default, the rest of the app.

## Scope and boundaries

In scope: file select → required-column validation (reject upfront if
name/email columns are structurally missing) → game night date confirmation
→ within-batch duplicate collapse → history matching → one-row-at-a-time
review triage for ambiguous rows only → batch summary.

Out of scope for this pass: browse/search and the player detail view
(Features 5–6 in `docs/spec/02-player-inventory.md`) — a fast-follow shape
session once this core loop is proven. No in-app record editing (non-goal,
see `docs/spec/00-overview.md`).

## States and ranges

- **Typical volume:** ~150–200 rows/batch; design the review queue to feel
  right whether it holds 0 rows (should read as a clean pass, not an empty
  error state) or a genuine handful — this is not a dense-table problem, it's
  a short, focused queue.
- **Bad upload:** wrong file type or missing required columns (name/email)
  rejects the whole file before any row processing, with a clear statement of
  what's missing. Row-level missing data still degrades gracefully to the
  "unusable rows" list per spec, not a hard reject.
- **Loading:** parsing ~150–200 rows plus a full-history match should read as
  fast (Linear-grade snappy), not a spinner-and-wait moment — set expectations
  accordingly rather than defaulting to a generic progress screen.
- **Zero-review happy path:** a batch with no flagged rows should still feel
  complete and confirmed, not like a step got skipped.
- **First-ever upload:** empty `Players`/`Participations` — every row is a new
  player. Should still feel calm, not alarming ("everything is new" isn't an
  error state).

## Interaction and layout

- Review queue: one ambiguous row at a time, focused triage — incoming
  submission shown against matched candidate(s), field-level differences
  called out, three actions (link to existing / add as new / skip), advance
  to the next automatically on decision. Batch commit only after every
  flagged row is resolved.
- Batch summary: card-based presentation (Apple Health register) of counts —
  auto-confirmed, flagged, resolved breakdown — not a raw data table.
- Snappy, deliberate transitions between steps (upload → validation →
  matching → triage → summary); no decorative motion.

## Constraints and open decisions

- Platform: web, Next.js (App Router), per `PRODUCT.md` Stack.
- Excel parsing and the Sheets write happen server-side (service-account
  credential never reaches the client).
- Open, not resolved here: exact fuzzy-match similarity threshold for
  flagging a name as "possibly the same person" — a tuning knob per
  `docs/spec/02-player-inventory.md`, not a visual decision.
- Open: whether dark mode is supported at all — light is the committed base,
  dark is explicitly not a v1 requirement.
