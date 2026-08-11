# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js (App Router), deployed to Vercel. Reasoning: the app needs
server-side calls to the Google Sheets API using a service-account credential that
must never reach the client, plus server-side Excel parsing on upload — both want a
request/response layer, not a static site. Next.js gives that (route handlers) in
the same deployable as the two UI surfaces, with Vercel as a low-ops fit for a
project this size.

## Users

- **Pastor & volunteers** — view the dashboard only. Never edit inventory data.
- **Admins** — upload the Excel registration export, resolve flagged duplicates,
  and are the only role that writes to the player inventory.

No per-person accounts in v1: each role reaches its surface through a shared
credential/link, not individual logins.

## Product Purpose

B1G Sportship is a church sports ministry program running weekly Game Nights.
Each week, registrants sign up through a Google Form; admins currently have to
turn that raw export into the kind of summary view pastors and volunteers need
(unique/weekly participant counts, returnee vs. first-timer trends, DGroup
involvement, sport popularity) largely by hand. This app automates that: admins
upload each week's export, it's matched against known players (only genuinely
ambiguous matches need a human decision), and the dashboard reads live off the
resulting history instead of being rebuilt per game night.

Full functional detail lives in `docs/spec/` (start at
`docs/spec/00-overview.md`) — this section stays high-level by design; see that
folder for the authoritative data model, ingestion flow, and dashboard metric
list.

## Positioning

No database, no per-person auth system, no silent data merging. The mechanism is a
Sheets-backed inventory with a mandatory human-review step on every detected
duplicate (exact email or fuzzy name match) before a write lands — light enough
infra for a volunteer-run program, but never auto-resolving data about a real
person without a human confirming it.

## Operating Context

- Registration data originates from a Google Forms export (sample on hand:
  `B1G Sportship 2026 - July 25 - Game Night Registration (Responses).xlsx`,
  80 columns). One export = one Game Night's roster, not a cumulative dump —
  confirmed by inspecting real response rows, not just headers.
- Admins upload roughly weekly, one game night per upload; the dashboard is
  checked by pastor/volunteers to track participation trends and DGroup
  involvement over time.

## Capabilities and Constraints

- **Store:** Google Sheets is the system of record — three tabs (`Players`,
  `Game Nights`, `Participations`). No database. See
  `docs/spec/01-data-model.md`.
- **Ingestion:** Excel upload is the only ingestion path in v1 (no manual
  add-registrant form). Roster files are PII and belong in the upload flow,
  never committed to the repo — root-level `*.xlsx` is gitignored, and the
  synthetic files in `fixtures/` stay tracked.
- **A re-submitted form updates what we know.** Added 2026-08-11: a returning
  player's record is refreshed in place from their latest answers, and every
  attendance stores the discipleship status given *that night*. Before this the
  ingest was append-only and every record stayed frozen at first sighting, so
  the follow-up lists were up to six months stale. Identity fields are still
  never rewritten. See `docs/spec/05-backfill.md`.
- **Inventory scope:** the full registrant record from the form export —
  sport participation *and* discipleship/DGroup status, life stage, church
  affiliation, and the other form fields — minus a confirmed-legacy "Week
  Nights Sportship" sub-program, which is dropped entirely.
- **Duplicate handling:** an exact email match auto-confirms as a returning
  player — no review needed, that's the common case. Only a genuinely
  ambiguous case (no email match, similar name) routes to a human review
  queue (link to existing player / add as new / skip). No automatic merge of
  identity data, ever. See `docs/spec/02-player-inventory.md`.
- **Access model:** two shared-credential gates — viewer (dashboard) and admin
  (inventory + upload). No individual accounts, no third role, in v1.
- **Dashboard:** strictly read-only; it can never mutate inventory data. Its
  confirmed metric list (participant counts, returnee/first-timer trends,
  DGroup breakdowns, sport popularity, top returning players) lives in
  `docs/spec/03-dashboard.md`.

## Brand Commitments

> **Revised 2026-08-11 — the dashboard now runs a different visual register.**
> Asked to overhaul the dashboard "completely to something professional" and
> shown a dense data-observability tool as the reference, the user chose:
> keep **Ember as the action colour**, adopt the reference's **density, layout
> and type character**, and give data marks their **own analytical palette**.
>
> So on `/dashboard`: a grey page ground with white panels, hairline borders
> and no card shadow, a larger headline figure step, ~12–13px supporting text,
> and an explanatory line under every figure. Discipleship segments use an
> **ordinal single-hue blue ramp** (darker = deeper involvement), validated as
> an ordinal set rather than picked by eye. Ember still carries actions and
> primary state, so the One-Voice Rule below still holds for chrome.
>
> Upload and Players remain in the original register below — the user chose
> "dashboard first, then the rest", so the app is deliberately mixed until
> that second pass. DESIGN.md is the authority on the built result.

The original direction, pinned during `/impeccable shape
player-inventory-upload` and still governing Upload and Players:

- **Register:** neutral efficient utility, deliberately not warm/ministry-themed.
  This is a data-processing chore tool for volunteers under time pressure; church
  identity lives elsewhere (copy, public-facing surfaces), not in this chrome.
- **Color:** Restrained strategy — white/clean as the overwhelming majority of the
  surface, `#FF6F2F` as the single accent, used deliberately (primary actions,
  key state) rather than scattered decoratively.
- **Craft bar — three named references, fused, not any single one copied
  wholesale:** Linear (deliberate, snappy micro-interactions; keyboard-fast
  triage flows), Notion / Things 3 (calm, content-first, minimal chrome, a
  focused single-item-at-a-time feel), Apple Health (native system chrome,
  generous whitespace, restrained motion, card-based data presentation).
- **Typography:** system font stack (`-apple-system`/SF Pro and equivalents) —
  matches both the Apple-native register and Operate mode's own default of
  workhorse UI faces over expressive display type.
- **Light vs. dark:** light is the explicit base ("keep majority feel white or
  clean"). Dark mode is not ruled out but isn't a v1 commitment — treat as an
  open decision per surface, not an assumed requirement.

This commitment governs the Player Inventory admin surface and, absent a
reason to diverge, is the default visual world for the rest of the app
(dashboard included) rather than a one-off choice for this surface alone.

## Evidence on Hand

- `B1G Sportship 2026 - July 25 - Game Night Registration (Responses).xlsx` —
  real sample of the Google Forms export this app ingests; confirms actual
  field names and data shape (used to disprove several early assumptions —
  see `docs/spec/01-data-model.md`).
- `dashboard_simple.jpg` — **retired**, no longer the dashboard reference.
  Included a Transportation/T-shirt tile that turned out to belong to a
  different, unrelated event and doesn't apply here. The dashboard's real
  requirements were supplied directly and live in `docs/spec/03-dashboard.md`.

## Product Principles

1. Sheets is the single source of truth — no hidden state to keep in sync with it.
2. Only genuine ambiguity is a human decision — a clean match (known email) or a
   clean miss (brand-new email) auto-resolves; a human is asked only when the
   system truly can't tell, never as a rubber-stamp step for the common case.
3. Participation history is append-only — a person's attendance record is never
   overwritten, only added to.
4. The dashboard is read-only, always — visibility for pastor/volunteers, never a
   mutation surface.
5. Two roles, not a permissions matrix — keep access as simple as the org actually
   needs, not as an abstraction for roles that don't exist yet.
