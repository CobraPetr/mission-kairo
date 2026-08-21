# Winter Arc Phase 0 architecture report

Status: **VERIFIED locally — 21 August 2026**

## Current architecture

- Mobile: Expo 57, React Native 0.86, React 19, Expo Router, TypeScript.
- Shared domain: `packages/domain`, deterministic and validated 90-day plan generation.
- Client state: React providers for authentication, onboarding, plans, and execution.
- Local persistence: AsyncStorage for onboarding, plan, and execution; SecureStore for Supabase sessions.
- Backend: Supabase Auth, Postgres migrations, RLS, trusted RPCs, and account-deletion Edge Function.
- Data fetching foundation: TanStack Query is installed, but the feature providers are not yet backed by Supabase repositories.
- Release: EAS profiles exist, but the project is not linked to the owner's Expo or Supabase accounts.

## A. What currently works

- Landing, onboarding, exact-section resume, validated measurements, identity-card ceremony, and plan preview.
- Deterministic 90-day plan generation and local plan restoration.
- Today, mission steps, pause/resume/skip, sealed days, trusted local transitions, XP display, current-week progress, and a real sealed-day streak.
- Authentication screens and Supabase client code for signup, email callback, phone verification, sign-in, reset, sign-out, and deletion.
- Secure native session storage and exact auth callback allow-listing.
- Protected route resolution that waits for phone, onboarding, plan, and execution state.
- Supabase migrations for profiles and the first secure persistence model.
- Formatting, lint, strict TypeScript, unit tests, production web build, and Expo web export.

## B. What is incomplete

- The application is not connected to a real Supabase project.
- Onboarding, plans, execution, and XP are still read and written directly from device-global AsyncStorage.
- Mobile repository contracts exist, but Supabase/local-cache adapters are not connected to providers.
- Plan activation and most execution commands are not yet trusted server operations.
- Live email/SMS delivery, session expiry, two-user RLS, account switching, and multi-device restore are unverified.
- Missed days, rescheduling, weekly reviews, photos, challenges, RevenueCat, notifications, observability, and native store builds remain later phases.

## C. What is stored locally today

| Data | Current storage | Current authority |
| --- | --- | --- |
| Supabase session | SecureStore on native; supported storage on web | Supabase Auth |
| Onboarding answers and consent | `winterarc.onboarding.v2` in AsyncStorage | Device only |
| Generated 90-day plan | `winterarc.plan.v1` in AsyncStorage | Device only |
| Mission state, sealed days, events, XP | `winterarc.execution.v1` in AsyncStorage | Device only |
| Query cache | Memory | Cache only |
| UI/reduced-motion state | System or memory | Local presentation only |

## D. What must move to Supabase

- Authenticated onboarding draft and immutable final submission.
- Canonical activated plan, plan days, and assigned missions.
- Execution, mission progress, sealed-day progress, append-only mission events, and XP ledger.
- Public-safe profile and private profile fields.
- Later: weekly reviews, challenge state, notification preferences, progress-photo metadata, and entitlement snapshots.

## E. What should remain local/cache-only

- A guest onboarding workspace before signup.
- User-scoped cached copies of server data for fast startup and offline display.
- A user-scoped pending-mutation queue containing canonical IDs, idempotency IDs, revisions, and timestamps—never client XP totals.
- Ephemeral form text, animation state, system accessibility settings, and non-sensitive UI preferences.
- Supabase refresh/session tokens remain in SecureStore, not AsyncStorage.

## F. What could break during migration

1. The guest plan is generated before account creation, so claiming it must be explicit and tied to the verified new account. Automatic claiming could attach one person's draft to a returning account.
2. Current AsyncStorage keys are device-global. Switching storage ownership too early could hide or leak existing local progress.
3. Offline retries can duplicate completion or XP unless every mutation uses a server idempotency key and revision.
4. A server plan must preserve the existing deterministic IDs and ordering or Today/Roadmap references will break.
5. The generated Supabase TypeScript types do not yet include the new persistence tables and RPCs.
6. The only Git root is nested at `apps/mobile`, while the app imports the root workspace package. A clean EAS or CI checkout cannot currently contain the complete monorepo.
7. Auth and RLS code can appear correct locally but still fail because of hosted redirect, SMTP, SMS, grant, or migration configuration.

## Phase 0 conclusion

Do not rewrite the UI or domain generator. The safest path is to keep the providers and screens, replace their direct AsyncStorage calls with repository adapters, make Supabase canonical after verification, and retain user-scoped local data only as a cache/offline queue.
