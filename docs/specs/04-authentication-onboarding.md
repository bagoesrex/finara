# Spec: Authentication and Onboarding

**Status:** Draft  
**PRD source:** Sections 43-45, 48, 57

## Objective

Allow a user to establish a private Finara identity and reach a usable Home with the fewest necessary onboarding steps. The onboarding goal is not to explain every feature; it is to create the minimum financial context required for the first transaction.

## Scope

- Account creation.
- Sign in and sign out.
- Server-side session validation.
- First financial account setup.
- Redirecting an authenticated and initialized user to Home.

Password recovery, social identity providers, email verification, multi-factor authentication, and account deletion are not defined by the PRD and require separate decisions.

## Requirements

- **AUTH-001:** Unauthenticated users cannot access private financial data or mutations.
- **AUTH-002:** Successful registration establishes an authenticated session or directs the user through the selected verification step.
- **AUTH-003:** A newly authenticated user without a financial account is directed to first-account setup.
- **AUTH-004:** First-account setup asks only for information required to create a usable account.
- **AUTH-005:** A user with at least one usable account bypasses onboarding and reaches Home.
- **AUTH-006:** Signing out invalidates the active server session and returns the user to a public authentication surface.
- **AUTH-007:** Authentication errors use generic wording that does not reveal whether a specific identity exists.
- **AUTH-008:** Redirect targets are validated and cannot send users to arbitrary external URLs.

## Primary flows

### First visit

```text
Landing -> create account -> authentication complete -> create first financial account -> Home
```

### Returning user

```text
Sign in -> validate session -> Home
```

### Incomplete onboarding

```text
Sign in -> no usable financial account -> first-account setup -> Home
```

## UI states

- Idle, submitting, success, validation error, authentication failure, and service failure.
- Existing session, expired session, and unauthenticated state.
- First-account form incomplete, saving, and failed.

Submission controls must prevent accidental duplicate requests while preserving entered non-secret values after recoverable errors.

## Security and privacy

- Session and user identity are resolved on the server.
- Financial ownership is never inferred from a client-provided user identifier.
- Authentication secrets, session tokens, and provider keys never appear in client-readable environment variables or logs.
- Cookies, if used, must use secure production settings appropriate to the chosen authentication library.
- Rate limiting and abuse controls must be specified before exposing public credential endpoints.

## Acceptance criteria

- A new user can progress from registration to a usable Home through the defined first-account flow.
- A returning initialized user does not see onboarding again.
- Direct access to a private route without a valid session does not disclose financial content.
- Sign-out makes the prior session unusable for subsequent private requests.
- Server-side ownership checks remain required even when UI routes are protected.
- Authentication and onboarding errors are recoverable and do not produce duplicate users or accounts.

## Open questions

- Authentication provider/library and session strategy.
- Required identity fields and whether email verification is mandatory.
- Password recovery and social-login scope.
- First-account fields, including initial balance and currency.
- Account deletion and personal-data deletion flow.
