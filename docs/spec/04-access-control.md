# Access Control

> **Status: built 2026-08-17.** Every route is behind a shared-credential gate
> enforced in `proxy.ts`. This file now describes shipped behaviour, not an
> intention.
>
> It was deferred on 2026-08-08 on the reasoning that the app was not exposed.
> Deployment ended that: for a period the production URL served 44 named
> individuals on the dashboard and 2,259 email addresses on `/players` to
> anyone with the link.

Two shared-credential gates. No per-person accounts, no auth provider, no
database of users — consistent with keeping this app's only infra dependency the
Google Sheet itself (`PRODUCT.md` Positioning).

## Roles

| Role | Grants |
|---|---|
| Viewer | Reads every surface — dashboard, directory, player detail, match board, nights — **contact details included**. |
| Admin | Everything a viewer can do, plus the write paths: upload and dedup review. |

**The line is read versus write, not dashboard versus directory.** The spec
originally gave the viewer the dashboard alone; that predates both `/match`
and the finding that the pastor's stated job is handing a name to a leader. A
dashboard whose funnel rows, movers link and roster names all dead-end is not
a smaller permission, it is a broken page. The action worth gating is
overwriting the source of truth.

## Mechanism

One password per role, checked server-side in `proxy.ts`, setting a signed
session cookie. No user table, no invite flow, no password reset — the
auth-provider weight this project avoided reintroducing.

- **Storage:** scrypt hashes in `AUTH_VIEWER_HASH` / `AUTH_ADMIN_HASH`. Generate
  with `node scripts/hash-password.mjs`; the passphrase never leaves the
  machine that typed it. The hash separator is a colon, **not `$`** — dotenv
  expands `$name`, which silently truncates a `$`-delimited hash to `"scrypt"`.
- **Session:** HMAC-SHA256 over `{role, exp, ver, jti}`, httpOnly + Secure +
  SameSite=Lax, 30 days. The expiry is inside the signature, so a copied cookie
  cannot outlive it.
- **Rotation:** bump `AUTH_CREDENTIAL_VERSION` to invalidate every live session.
  Do this whenever a password changes or a volunteer leaves.
- **Both hashes are always evaluated** on a sign-in attempt, so response time
  never reveals which credential was found.
- **Defence in depth:** every write action in `app/upload/actions.ts` re-checks
  the role itself rather than trusting the proxy's matcher.

### Known limits, accepted deliberately

A shared password cannot be revoked for one person, produces no record of who
read what, and will end up in a chat thread. Rate limiting is per-instance and
therefore weak on serverless — the real defence is passphrase length, which is
why the hashing script refuses anything under 16 characters. The path off this
is Google sign-in restricted to an allowlist: it removes the shared secret,
gives real identity and revocation, and turns `uploaded_by` from a courtesy
label into something true.

`uploaded_by` in `Upload Batches` ([01-data-model.md](01-data-model.md)) records
whatever identity label the admin enters at credential entry (e.g. a name typed
once per session) — this is a courtesy audit field, not an authenticated
identity, since the credential itself is shared.

## Explicitly out of scope

- Per-person accounts or roles beyond the two above.
- Password reset / account recovery flows.
- Any third role — if one becomes necessary later, it's a new spec, not an
  extension of this file.
