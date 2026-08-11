# Access Control

> **Status: deferred, not built.** Decided 2026-08-08: every route (`/upload`,
> `/players`, `/players/[id]`, `/dashboard`) is open to anyone with the URL for
> now — no credential check exists anywhere in the app. This spec is kept as
> the intended design for when access control is picked back up, not as a
> description of current behavior. The navbar was simplified to match: it
> shows all destinations on every page rather than role-splitting a boundary
> that doesn't actually exist yet (see `docs/spec/00-overview.md` and
> `DESIGN.md` → Components → Navigation).

Two shared-credential gates. No per-person accounts, no auth provider, no
database of users — consistent with keeping this app's only infra dependency the
Google Sheet itself (`PRODUCT.md` Positioning).

## Roles

| Role | Guards | Grants |
|---|---|---|
| Viewer | [03-dashboard.md](03-dashboard.md) | Read-only dashboard. Nothing else. |
| Admin | [02-player-inventory.md](02-player-inventory.md) | Upload, dedup review, browse/search, player detail. Implicitly includes viewer access. |

## Mechanism

A shared credential (password or unlisted-link token) per role, checked
server-side, setting a session cookie scoped to that role. Not building
individual logins, invite flows, or password reset — those are the auth-provider
weight this project explicitly avoided reintroducing.

`uploaded_by` in `Upload Batches` ([01-data-model.md](01-data-model.md)) records
whatever identity label the admin enters at credential entry (e.g. a name typed
once per session) — this is a courtesy audit field, not an authenticated
identity, since the credential itself is shared.

## Explicitly out of scope

- Per-person accounts or roles beyond the two above.
- Password reset / account recovery flows.
- Any third role — if one becomes necessary later, it's a new spec, not an
  extension of this file.
