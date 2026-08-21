# Winter Arc Supabase schema and RLS

Status: **IMPLEMENTED — NEEDS TESTING against the owner's linked Supabase project**

## Implemented schema

| Table | Purpose | Authenticated client access |
| --- | --- | --- |
| `profiles_public` | Username, avatar path, trusted XP/streak totals | Public-safe read; owner updates username/avatar only |
| `profiles_private` | Name, measurements, units, relationship and onboarding state | Owner read; owner updates safe profile columns only |
| `onboarding_drafts` | One revisioned draft per user | Owner read; writes through RPC |
| `onboarding_submissions` | Immutable accepted answers/assessment/consent | Owner read; trusted server writes |
| `plans` | Canonical activated plan | Owner read; trusted server writes |
| `plan_days` | Ordered plan calendar | Owner read; immutable trusted writes |
| `plan_missions` | Canonical mission assignments and XP rewards | Owner read; immutable trusted writes |
| `arc_executions` | Active day/current mission/revision | Owner read; trusted operations write |
| `day_progress` | Locked/available/sealed/missed day state | Owner read; trusted operations write |
| `mission_progress` | Step and terminal mission state | Owner read; trusted operations write |
| `mission_events` | Append-only idempotent execution events | Owner read; trusted operations write |
| `xp_ledger` | Append-only canonical XP changes | Owner read; trusted operations write |

All plan/execution child tables carry composite ownership foreign keys. Deleting `auth.users` cascades through current user-owned rows.

## Trusted operations implemented

- `save_onboarding_draft`: authenticated user derived from `auth.uid()`, payload limits, expected-revision conflict detection.
- `complete_mission`: authenticated ownership check, active-plan check, expected execution revision, canonical mission XP, append-only event, ledger entry, profile total update, and idempotency protection.
- Auth triggers: safe profile creation and confirmed-phone synchronization.
- Account deletion Edge Function: deletes the authenticated Auth user; database rows cascade.

## Security invariants

- `anon` has no access to user persistence tables.
- An authenticated user can select only rows whose `user_id` equals `auth.uid()`.
- Direct authenticated writes to plans, execution, events, and XP are revoked.
- Users cannot update `total_xp`, `current_streak`, `phone_e164`, `onboarding_status`, or `onboarding_version` directly.
- Immutable submissions, plan assignments, events, and ledger rows reject updates.
- Mission completion never accepts an XP amount from the client.
- One user's plan/mission identifiers cannot be combined with another user's rows because of composite ownership constraints.

## Migrations to apply in order

1. `20260820120000_initial_profiles.sql`
2. `20260820153500_sync_verified_phone.sql`
3. `20260821103000_user_scoped_persistence.sql`
4. `20260821110000_lock_private_profile_columns.sql`

The fourth migration is non-destructive. It only narrows authenticated UPDATE grants on `profiles_private`; existing rows and values remain unchanged.

## Verification available

- 50 pgTAP assertions are written across profile and persistence suites.
- The first three migrations passed PostgreSQL parsing and embedded application.
- Behavioral smoke passed for ownership isolation, revision conflict, canonical XP, idempotent retry, cross-user rejection, and account-deletion cascade.
- The final column-permission migration is intentionally marked **IMPLEMENTED — NEEDS TESTING** until the full ordered migration set and all pgTAP assertions run against Docker or the linked project.

## Planned later extensions

These should be added only when their feature phase begins:

- `weekly_reviews`
- `progress_photos` plus a private Storage bucket and object policies
- `challenges`, `challenge_memberships`, and trusted challenge events
- `notification_preferences` and device tokens
- `subscription_entitlements` and idempotent RevenueCat webhook events

Delaying these tables avoids speculative schema and does not block the first multi-device milestone.

## External configuration required now

In the owner's Supabase dashboard:

1. Create or select the development project.
2. Provide the project reference, project URL, and public publishable/anon key.
3. Authenticate the local Supabase CLI and link this workspace to the development project.
4. Review and push the four ordered migrations.
5. Run both database test files.
6. Configure exact native/web redirect URLs.
7. Configure production SMTP and the selected SMS provider before live delivery testing.

The project URL and publishable key are public client configuration and belong in EAS environment values as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Legacy `anon` keys remain compatible, but new projects should use `sb_publishable_…`. The Supabase access token, database password, secret/service-role key, SMTP password, and SMS provider token are secrets and must never be placed in `EXPO_PUBLIC_` variables or committed files.
