# Data Model — Google Sheet as System of Record

One Google Sheet, three tabs. No database. Revised from an earlier two-tab draft
once the dashboard requirements ([03-dashboard.md](03-dashboard.md)) made clear
that per-game-night history is load-bearing, not optional — see that file's
opening note for why a single overwritable row per person can't produce metrics
like "returnees per game night" or "top returning players' frequent sports."

Mapping source: the raw Google Forms export on hand,
`B1G Sportship 2026 - July 25 - Game Night Registration (Responses).xlsx`
(80 columns). The filename itself is a clue that was initially missed: this
export is *one game night's* roster, not a cumulative multi-week dump — which
is why participation is modeled as one append-only row per player per game
night below, rather than a mutable "current sport" field on `Players`.

## Tab: `Players`

One row per deduped person. Holds **identity only** — facts about the person
that don't reset or repeat each game night. Never holds anything about a
specific week's attendance; that's `Participations`.

### Dedup key

- **Primary key:** normalized email — trimmed, lowercased. Source priority:
  the form's own respondent-collected `Email Address` column first (col 2 in the
  raw export — captured by Google Forms itself, can't be mistyped), falling back
  to the hand-typed `Email Address 2` (col 11) if the first is blank.
- **Secondary signal (review-queue trigger only, never auto-match):** normalized
  `last_name, first_name` similarity above a fuzzy-match threshold. Catches the
  same person under two email addresses, or a typo'd email — but never
  auto-resolves; it only puts the row in front of an admin. See
  [02-player-inventory.md](02-player-inventory.md) for the full match/review
  flow, including why an **exact email match no longer needs review** (it's
  confirmation a known player is back, not an ambiguous case).

> **Players is not append-only — revised 2026-08-11.** It was, and that was a
> defect: every record stayed frozen at first sighting, so 1081 of 1081 rows
> had never been updated while 526 of those people had re-submitted the form
> with newer answers that were silently discarded. A returning player's row is
> now refreshed in place.
>
> **Refreshable:** `gender`, `civil_status`, `dgroup_member_status`,
> `dgroup_status`, `dgroup_interested_in_joining`,
> `dgroup_leading_willing_to_absorb`, `church_affiliation`, `raw_json`.
>
> **Never refreshed:** `player_id`, `first_name`, `last_name`, `email`,
> `first_seen_game_night_id`, `first_seen_at`. Name and email are what dedup
> matches on — letting a typo in a later export rewrite them would silently
> split or merge real people.
>
> A **blank** answer on a later form means "no new information", never an
> erasure: a skipped question does not wipe what is already known.

### Fields

System/meta (not from the form):

| Field | Type | Notes |
|---|---|---|
| `player_id` | string | Stable internal id, assigned on first insert. Join key for `Participations`. |
| `first_seen_game_night_id` | string | FK to `Game Nights` — when this person was first ever seen. |
| `first_seen_at` | datetime | System-assigned. |
| `last_updated_at` | datetime | System-assigned. **Revised 2026-08-11:** bumped whenever a returning player's re-submitted form carries a *changed* answer in a refreshable field (see below) **and** that submission is chronologically the latest game night on record for them — an older night uploaded after newer ones (a backfill, a rediscovered export) writes its `Participations` row as always, but does not touch this snapshot. So this reads "when the most recent known answers last moved", not "when we last saw them" — last seen is derivable from `Participations`. |

Identity:

| Field | Source column(s) |
|---|---|
| `first_name` | First Name |
| `last_name` | Last Name |
| `nickname` | Nickname — see the note below |
| `email` | Email Address (fallback: Email Address 2) — normalized, the dedup key |
| `email_raw_secondary` | Email Address 2 / Confirm Email Address, kept for reference |
| `mobile_number` | Mobile Number — see the note below |
| `birth_month` | Birth Month |
| `birth_year` | Birth Year |
| `gender` | Gender |
| `civil_status` | Civil Status |
| `social_media_account` | Social Media Account |
| `house_address` | House Address |
| `languages` | Spoken and written language used |
| `profession` | Your Profession/Work |
| `workplace_area` | Your Workplace Area |

> **`nickname` and `mobile_number` were specified but never mapped — fixed
> 2026-08-12.** Both had a `Players` column and a store mapping from the
> start, but neither was ever added to `COLUMN_MAP`, so the parser swept them
> into `raw_json` and wrote both columns blank on every row: **0 of 1081**
> players had a nickname stored, while **1080 of 1081** had actually answered
> the question. `lib/column-map.ts` now claims both, so new uploads populate
> them properly, and `rowToPlayer` reads through to `raw` for everything
> written before the fix — no re-upload needed, the data was never lost.
>
> Nickname is load-bearing rather than cosmetic here: people in this ministry
> are known by it ("Patz", not "Patrick Christian"), so the directory shows it
> and searches it. It is **not** a dedup key — matching still runs on
> first/last/email only (`lib/match.ts`), so a changed nickname can never
> split or merge a person.

## DGroup preference fields — promoted to first-class use 2026-08-14

Seven form fields describe the *shape* of a discipleship group. They exist in
three parallel sets, and which set a person answers depends on where they
stand — a leader describes the group they run, a would-be leader the one they
plan to run, a seeker the one they want to join.

| Dimension | Leading (184) | Plan to lead (126) | Plan to join (86) |
|---|---|---|---|
| Days | `Which days are you leading your discipleship group?` | `…planning to lead…` | `…planning to join…` |
| Time | `Time of Discipleship Group you are leading` | `…you plan to lead` | `…you plan to join` |
| Age range | `Age range of Discipleship Group you are leading` | `…you plan to lead` | `…you plan to join` |
| Location | `Location of Discipleship Group your are leading` | `…you plan to lead` | `…you plan to join` |
| Type/setup | `Type of Discipleship Group you are leading` | `…you plan to lead` | `…you plan to join` |
| Language | `Language of Discipleship Group your are leading` | `…you plan to lead` | `…your plan to join` |
| Marital status | `Marital Status of Discipleship Group your are leading` | `…you plan to lead` | — |

**The typos are in the source and must be matched exactly.** `Location of
Discipleship Group *your* are leading`, `Language of Discipleship Group *your*
plan to join` — reading these keys is only reliable if the misspelling is
reproduced verbatim. Do not "correct" them.

All of them live in `raw_json` only; none has a typed column. That is
deliberate for now — they are read by `lib/matching.ts` and by the dashboard's
supply-against-demand panel, and neither needs them indexed.

**Value shapes, measured 2026-08-14:**

- **Days** — comma-separated multi-select (`Sunday, Saturday`). Split on
  `[,;]` before counting, or Sunday-plus-Saturday reads as its own category.
- **Time** — an **Excel serial date**: `1899-12-30T11:00:00.000Z`. The hour is
  read off the string and **never timezone-converted**, the same rule that
  governs `attendedAt`. Passing it through `new Date()` shifts every group's
  meeting time by the runtime's offset.
- **Age range** — free text, and inconsistent between the two sides. Leaders
  write ranges (`25-35`, `25-30`); seekers frequently write a single age
  (`23`, `27`). `parseAgeRange` in `lib/matching.ts` handles both.
- **Location, type, language, marital status** — controlled vocabularies, safe
  to count as given after trimming.

Emergency contact:

| Field | Source column(s) |
|---|---|
| `emergency_contact_name` | Person to contact in case of emergency |
| `emergency_contact_relationship` | Relationship of contact person |
| `emergency_contact_number` | Contact Number in Case of Emergency |
| `medical_conditions_allergies` | Medicial Condition including allergies |

Church & membership:

| Field | Source column(s) |
|---|---|
| `church_affiliation` | Which church are you attending? |
| `church_name` | Name of the church you are attending |
| `ccf_campus` | Which CCF are you attending? |
| `local_satellite` | Local Satellite |
| `international_satellite` | International Satellite |
| `water_baptized` | Have you been water baptized? |
| `glc_level` | What GLC level have you finished? |
| `retreats_attended` | Have you attended any True Life retreats? |
| `commitment_card_number` | Commitment Card Number |

DGroup involvement — the form branches into three conditional sub-sections
(join-intent, planning-to-lead, currently-leading); mirrored 1:1 rather than
collapsed, since collapsing risks losing which branch a given answer came from.
Treated as identity (current status), not per-game-night data — it changes
slowly and isn't tied to which sport someone played that week:

| Field | Source column(s) |
|---|---|
| `dgroup_member_status` | Are you part of a Discipleship Group? |
| `dgroup_status` | Your DGroup Status? |
| `dgroup_leader_name` | DGroup Leader Name |
| `dgroup_leader_contact` | DGroup Leader Contact Number |
| `dgroup_interested_in_joining` | Are you interested in joining a Discipleship Group |
| `dgroup_join_obstacles` | What obstacles are you facing in starting to join a Discipleship Group? |
| `dgroup_join_type` | Type of Discipleship Group you plan to join |
| `dgroup_join_days` | Which days are you planning to join your discipleship group? |
| `dgroup_join_time` | Time of Discipleship Group you plan to join |
| `dgroup_join_age_range` | Age range of Discipleship Group you plan to join |
| `dgroup_join_location` | Location of Discipleship Group you plan to join |
| `dgroup_join_language` | Language of Discipleship Group your plan to join |
| `dgroup_planning_to_lead` | Are you planning to lead a DGroup soon? |
| `dgroup_plan_lead_obstacles` | What obstacles are you facing in starting your Discipleship Group? |
| `dgroup_plan_lead_type` | Type of Discipleship Group you plan to lead |
| `dgroup_plan_lead_days` | Which days are you planning to lead your discipleship group? |
| `dgroup_plan_lead_time` | Time of Discipleship Group you plan to lead |
| `dgroup_plan_lead_age_range` | Age range of Discipleship Group you plan to lead |
| `dgroup_plan_lead_location` | Location of Discipleship Group you plan to lead |
| `dgroup_plan_lead_language` | Language of Discipleship Group you plan to lead |
| `dgroup_plan_lead_marital_status` | Marital Status of Discipleship Group you plan to lead |
| `dgroup_plan_lead_absorb_capacity` | How many members are you willing to absorb? |
| `dgroup_plan_lead_discipling_duration` | How long have you been discipling? |
| `dgroup_plan_lead_concerns` | Type here your concerns in leading your DGroup |
| `dgroup_leading_type` | Type of Discipleship Group you are leading |
| `dgroup_leading_days` | Which days are you leading your discipleship group? |
| `dgroup_leading_time` | Time of Discipleship Group you are leading |
| `dgroup_leading_age_range` | Age range of Discipleship Group you are leading |
| `dgroup_leading_location` | Location of Discipleship Group your are leading |
| `dgroup_leading_language` | Language of Discipleship Group your are leading |
| `dgroup_leading_marital_status` | Marital Status of Discipleship Group your are leading |
| `dgroup_leading_willing_to_absorb` | Are you willing to absorb members? |

> ⚠️ Not yet confirmed: `Are you interested in participating in Youth Sport
> Fellowship?` and `Are you interested in joining Family Sports Fellowship?`
> sit in the same part of the form as the confirmed-legacy Week Nights
> Sportship questions, but were not explicitly confirmed dead — left out of
> the field tables here as a tentative call, not asserted fact.

Dropped from the model entirely (legacy "Week Nights Sportship" program,
confirmed no longer relevant): `Are you interested in participating in Week
Nights Sportship?`, `Sportship Primary Sport`, `Sportship Primary Sport
Level`, `Sportship Secondary Sport`, `Sportship Secondary Sport Level`.

## Tab: `Game Nights`

One row per weekly upload. Renamed from the earlier "Upload Batches" — since
one upload reliably means one game night, the table is the actual join key for
attendance history, not just an audit log.

| Field | Type | Notes |
|---|---|---|
| `game_night_id` | string | Primary key. Join key for `Participations`. |
| `game_night_date` | date | **Admin-entered at upload time** (default: today), not derived from row timestamps — the form's per-row `Timestamp` is when someone *signed up*, which can trail the actual game night by days, and isn't reliable as the event date. |
| `uploaded_at` | datetime | |
| `uploaded_by` | string | Admin identity/label — see [04-access-control.md](04-access-control.md) for what identity means under a shared-credential model. |
| `source_filename` | string | As uploaded. |
| `row_count` | number | Rows in the file. |
| `auto_confirmed_count` | number | Exact-email matches (returning players) + brand-new players — inserted without review. See [02-player-inventory.md](02-player-inventory.md). |
| `flagged_count` | number | Routed to the review queue (no email match, similar name). |
| `resolved_link_existing_count` | number | Review outcome breakdown — | 
| `resolved_add_new_count` | number | see [02-player-inventory.md](02-player-inventory.md) |
| `resolved_skip_count` | number | for what each outcome means. |

## Tab: `Participations`

One row per player per game night. This table *is* the **registration**
history, and every returnee/first-timer/frequency metric in
[03-dashboard.md](03-dashboard.md) is computed from it.

> **Registering and attending are different events — corrected 2026-08-12.**
> This table was documented as "the attendance history" and it never was. On
> 2026-05-30, **183 people registered and 131 checked in at the door — a 56%
> show-up rate**, so everything the app called attendance overstated it by
> nearly a factor of two.
>
> Rows are still append-only *from registration*. A check-in file later writes
> `attended_at`, `attended_sport`, and (for a walk-in) a whole row with
> `registered = FALSE` — see [06-attendance.md](06-attendance.md).

> **Why discipleship status is duplicated here.** `Players` holds a person's
> *current* standing — one row, overwritten as they change. That cannot answer
> "what was the mix of the room on May 9," because a person who became a
> leader in June would be counted as a leader in May too.
>
> These three columns record what the person answered on the night itself, so
> the per-night charts are a measurement rather than today's status projected
> backwards. They were added 2026-08-11; rows written before that leave them
> blank and the dashboard labels those nights as inferred. See
> [05-backfill.md](05-backfill.md).

| Field | Type | Notes |
|---|---|---|
| `participation_id` | string | Primary key. |
| `player_id` | string | FK to `Players`. |
| `game_night_id` | string | FK to `Game Nights`. |
| `sport_selected` | string | 🏀 Basketball / 🏸 Badminton / 🏐 Volleyball / 🥒 Pickleball / 🏃 Running — fixed 5-value set, confirmed by dashboard requirements. |
| `skill_level` | string | Kept for inventory completeness (team-balancing use); not a dashboard metric. |
| `is_first_participation` | boolean | **Computed at write time**, not read from the form's self-reported "Is this your first time registering?" checkbox — self-report is unreliable (people misremember/misclick). True iff no earlier `Participations` row exists for this `player_id`. |
| `submitted_at` | datetime | Raw `Timestamp` from the form row — when they filled it out, not necessarily the game night date. |
| `dgroup_status` | string | **Point-in-time**, added 2026-08-11. What this person answered on *this night's* form. See the note below. |
| `dgroup_interested_in_joining` | string | Point-in-time, as above. |
| `dgroup_leading_willing_to_absorb` | string | Point-in-time, as above. |
| `game_night_rules_accepted` | boolean | Game Night Rules |
| `media_release_accepted` | boolean | Media Release |
| `data_privacy_consent` | boolean | Data Privacy Consent |
| `attestation_signed` | boolean | Sign the attestation form |
| `liability_release_signed` | boolean | Release of Liability |
| `participation_acknowledgement_signed` | boolean | Participation Acknowledgement |

Consents live here, not on `Players` — they're signed per game night, not a
durable fact about the person.

## Field-count reduction, deliberately not done

`Players` mirrors the form close to 1:1 rather than curating down to a smaller
"supported" field set. Sheets columns are free; dropping a field now that the
dashboard doesn't currently need is a data-loss decision with no upside — add
narrower *views* on top (e.g., a dashboard query that only reads 15 of these
columns) rather than narrowing the source of truth itself.
