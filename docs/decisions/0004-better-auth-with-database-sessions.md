# ADR 0004: Better Auth with Database Sessions

**Status:** Accepted
**Date:** 2026-08-28
**Decision owner:** Product owner

## Context

Finara needs public email/password registration and sign-in before it can persist onboarding or expose private financial operations. Authentication must resolve a trusted user identity on the server, revoke sessions on sign-out, and protect a PostgreSQL ownership boundary without requiring a hosted identity provider for the MVP.

The existing `User` model is the owner of financial `Account` and `Category` records. Better Auth also uses core concepts named user, account, session, and verification, so its default account model would collide with Finara's financial `Account` model.

Next.js recommends using an authentication library rather than implementing credentials and sessions from scratch, and recommends secure authorization checks close to the data source rather than relying only on layouts or client context.

## Decision

Finara will use Better Auth 1.7.2 with its Prisma adapter and PostgreSQL-backed sessions.

- Enable only email/password authentication for the MVP. Registration requires name, email, and a password between 8 and 128 characters.
- Use Better Auth's default `scrypt` password hashing. Passwords and password hashes never enter Finara DTOs, client state, or logs.
- Reuse Finara's `User` model as the Better Auth user and financial ownership boundary. Add the identity fields Better Auth requires rather than creating a second user record that could drift from domain ownership.
- Map Better Auth's remaining core models to `AuthIdentity`, `AuthSession`, and `AuthVerification`. This avoids ambiguity with Finara's financial `Account` model.
- Store rate-limit state in PostgreSQL as `AuthRateLimit`, enable rate limiting in every environment, and retain Better Auth's stricter built-in email sign-in rule.
- Use opaque database sessions with the default seven-day rolling expiry and daily refresh. Do not enable session cookie caching so session revocation and sign-out take effect on the next server validation.
- Mount Better Auth on `/api/auth/[...all]`. Authentication endpoints are the only public mutation surface in this increment.
- Keep Better Auth's CSRF, origin, and redirect checks enabled. Trusted origins come from server-only configuration, and application redirects use internal relative paths.
- Treat route protection as navigation assistance only. Every later financial read and mutation must resolve the database session in a server-only data-access layer and scope its query by `session.user.id`.
- Keep `BETTER_AUTH_SECRET` and deployment origin configuration server-only. Commit placeholders only.

Email verification, password recovery, OAuth/social providers, MFA, account deletion, cross-subdomain cookies, and session cookie caching remain outside the MVP authentication increment. They require separate product and operational decisions.

## Threat model and abuse cases

### Assets

- Password hashes and session tokens.
- User identity and private financial records.
- The ownership relationship between a user and every finance row.

### Trust boundaries

- Untrusted browser requests entering `/api/auth/*`.
- The session cookie crossing from the browser to server validation.
- Authenticated identity crossing from Better Auth into Finara's data-access layer.
- Better Auth records persisted through Prisma into PostgreSQL.

### Required controls

- Credential stuffing and brute force are bounded by database-backed rate limiting.
- Registration and sign-in failures use generic application copy and do not perform client-visible email-existence probes.
- Cookies remain `httpOnly`, `sameSite=lax`, and `secure` whenever the configured origin uses HTTPS.
- CSRF/origin checks and redirect validation are never disabled.
- Sign-out deletes the active database session; no cached session may extend its authority.
- Financial authorization never accepts a client-provided user ID and is repeated at each data access boundary.
- Temporary auth integration tests create unique synthetic identities and delete every related row afterward.

## Consequences

- Finara avoids implementing password hashing, session issuance, CSRF protection, and credential throttling itself.
- The `User` schema gains Better Auth identity fields, while credentials stay isolated in `AuthIdentity`.
- Every authenticated request performs a database session lookup. This is an intentional correctness tradeoff for immediate revocation in a finance application.
- A later multi-instance deployment can share rate-limit counters through PostgreSQL without relying on process memory.
- Email verification and password recovery must be added before claiming verified email ownership or a production-complete account recovery flow.

## Alternatives considered

### Auth.js Credentials provider

Rejected for this MVP because its Credentials provider does not persist credential data by default and leaves password storage, registration, and rate limiting to application code. That expands the security-critical custom surface without a product benefit.

### Custom password and session implementation

Rejected because Next.js documents the complexity and recommends an authentication library. Owning cryptographic storage, rotation, CSRF handling, throttling, and session revocation is unnecessary risk.

### Hosted authentication service

Deferred because the MVP requires only email/password and already has PostgreSQL. A hosted service would add an external privacy, cost, and availability dependency before Finara needs OAuth or enterprise identity.

### JWT or cached-cookie sessions

Rejected for the current financial-data boundary because revoked sessions can remain authoritative until token or cache expiry. Database validation provides immediate server-side revocation with acceptable MVP load.

## Sources

- Next.js authentication guide: https://nextjs.org/docs/app/guides/authentication
- Better Auth Next.js integration: https://better-auth.com/docs/integrations/next
- Better Auth Prisma adapter: https://better-auth.com/docs/adapters/prisma
- Better Auth email/password authentication: https://better-auth.com/docs/authentication/email-password
- Better Auth session management: https://better-auth.com/docs/concepts/session-management
- Better Auth security: https://better-auth.com/docs/reference/security
- Better Auth rate limiting: https://better-auth.com/docs/concepts/rate-limit
- Auth.js Credentials provider: https://authjs.dev/getting-started/authentication/credentials
