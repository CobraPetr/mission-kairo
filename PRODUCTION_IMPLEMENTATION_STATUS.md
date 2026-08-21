# Winter Arc production implementation status

Updated: 21 August 2026

Status vocabulary: `NOT STARTED`, `IN PROGRESS`, `BLOCKED — USER ACTION REQUIRED`, `IMPLEMENTED — NEEDS TESTING`, `VERIFIED`.

## Phase 0 — Protect and audit

Status: **VERIFIED**

- Repository, frameworks, packages, auth, local storage, onboarding, plan, execution, XP, streak, challenges, Supabase, environment, EAS, platform code, payments, notifications, and security inspected.
- Current/local/server/cache data boundaries documented.
- Migration failure risks documented.
- Full application quality gate passes.

## Phase 1 — Supabase architecture

Status: **VERIFIED**

- Normalized first-milestone persistence tables implemented.
- Ownership foreign keys, indexes, constraints, timestamps, cascades, immutable records, and trusted RPC boundaries implemented.
- Mobile repository contracts and scoped cache-key rules implemented.
- The `winter-arc-development` project is active in Frankfurt on the free plan.
- All six ordered migrations are applied to the hosted project.
- Hosted database types are generated for the mobile client.
- The authenticated `delete-account` Edge Function is deployed and active.
- Onboarding drafts now use owner-scoped encrypted native caches, session-only web preview storage, automatic plain-cache migration, and revision-safe Supabase synchronization.
- Verified accounts atomically reserve the username, submit the immutable intake, and activate a canonical 90-day plan.
- Plan restoration and mission execution now read canonical server state.

## Phase 2 — Security and RLS

Status: **IMPLEMENTED — NEEDS TESTING**

- RLS enabled on every implemented user-owned table.
- Owner-only read policies and revoked direct canonical writes implemented.
- Server-managed private-profile columns are no longer client-writable.
- 86 ownership, activation, canonical XP, idempotency, revision-conflict, and integrity assertions pass against the isolated Supabase stack.
- The hosted `public` schema passes Supabase lint with warnings treated as failures.

Remaining verification:

- Perform live User A/User B API attempts with real Supabase sessions.
- Verify real email delivery, deletion, and second-device restoration; SMS requires a provider.

## First milestone

Status: **IN PROGRESS**

Implemented and verified locally:

- Server-backed onboarding draft synchronization with separate guest and account caches.
- Idempotent, transactional onboarding submission and 90-day plan activation.
- Private canonical mission templates; clients cannot choose mission XP.
- Server-authoritative begin, pause, resume, advance, complete, skip, and close-day commands.
- Account plan/execution restoration with revision-conflict refresh.
- 80 passing mobile tests, strict mobile type-check, 86 passing database assertions, and clean local/hosted public-schema lint.

Remaining before this milestone is fully verified:

- Configure real SMTP and SMS providers.
- Run the complete flow with two real hosted users and on two devices.
- Add durable offline mission mutation queue/retry; current offline support is read-only cached state.
