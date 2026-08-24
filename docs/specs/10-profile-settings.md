# Spec: Profile and Settings

**Status:** Draft  
**PRD source:** Sections 43-44

## Objective

Provide access to identity, finance configuration, preferences, privacy, and sign-out without creating a secondary profile dashboard.

## Information architecture

The top-level Profile surface remains compact and uses progressive disclosure:

```text
Profile
|-- Accounts
|-- Categories
|-- Preferences
|   |-- Currency
|   |-- Language
|   `-- Appearance
|-- AI preferences
|-- Data & privacy
`-- Sign out
```

Only settings that are implemented and meaningful should be visible.

## Requirements

- **PROF-001:** Profile shows the minimum useful identity information and links to grouped settings.
- **PROF-002:** Account and category management follow [`05-accounts-categories.md`](./05-accounts-categories.md).
- **PROF-003:** Preference screens use progressive disclosure and do not expose future toggles that have no behavior.
- **PROF-004:** Currency and language changes explain their effect before saving when they can alter financial presentation.
- **PROF-005:** Appearance respects the supported system/light/dark decision once that decision is accepted.
- **PROF-006:** AI preferences cannot weaken server authorization, validation, transaction confirmation, or safety boundaries.
- **PROF-007:** Data & Privacy explains relevant data use in concise language and links to any supported data actions.
- **PROF-008:** Sign out is clear, reachable, and uses the authentication behavior in [`04-authentication-onboarding.md`](./04-authentication-onboarding.md).

## UI states

- Profile loading and available.
- Setting loading, unchanged, dirty, saving, saved, and failed.
- Unsupported or unavailable preference.
- Sign-out pending and failed.

## Acceptance criteria

- A user can locate Accounts, Categories, Preferences, Data & Privacy, and Sign out without scanning an analytics dashboard.
- Rare settings are nested rather than displayed as equal-priority Home-style content.
- A setting is not shown unless its value is persisted and affects behavior.
- Failed saves preserve the previous persisted value and allow retry.
- Signing out invalidates the active session.
- No setting permits access to another user's financial data.

## Open questions

- Which identity fields users may edit.
- Language and currency availability at launch.
- Dark mode MVP scope.
- AI preference options beyond the explicitly post-MVP auto-save feature.
- Export and account/data deletion timing; export is listed as Phase 2.
