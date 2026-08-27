# Winter Arc production implementation status

Updated: 27 August 2026

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
- All seven prior ordered migrations are applied to the hosted project. The eighth through tenth
  migrations for the canonical generator, hardened invariants, and retry-safe mission commands are
  locally verified and intentionally await review and deployment approval.
- Hosted database types are generated for the mobile client.
- The authenticated `delete-account` Edge Function is deployed and active.
- Onboarding drafts now use owner-scoped encrypted native caches, session-only web preview storage, automatic plain-cache migration, and revision-safe Supabase synchronization.
- Verified accounts atomically reserve the username, submit the immutable intake, and activate a
  canonical 90-day plan. Generator v2 now runs from one portable source in both preview and the local
  activation Edge runtime; hosted deployment remains pending.
- Plan restoration and mission execution now read canonical server state.
- Protocol activation refresh now resolves against the complete hydration identity instead of
  leaving the application route gate in a restoring state.

## Phase 2 — Security and RLS

Status: **IMPLEMENTED — NEEDS TESTING**

- RLS enabled on every implemented user-owned table.
- Owner-only read policies and revoked direct canonical writes implemented.
- Server-managed private-profile columns are no longer client-writable.
- 193 ownership, activation, canonical XP, calendar, idempotency, revision-conflict, and integrity assertions
  pass against the isolated Supabase stack.
- The v1 activation path is email-only. Phone collection, SMS verification, phone claims, and
  self-attested guardian approval have been removed from the active client path.
- The public beta policy requires verified email and activates adults only. Ages below 18 remain
  closed for v1.0 instead of shipping an unverified guardian workflow.
- The hosted `public` schema passes Supabase lint with warnings treated as failures.

Remaining verification:

- Repeat the passing local User A/User B API isolation matrix against the hosted development project
  after the pending migrations and Edge Function are approved and deployed.
- Configure authenticated SMTP and verify signup, resend, reset, expiry, rate limits, deletion, and
  second-device restoration on iOS and Android.
- Keep minor activation disabled throughout the public beta.

## First milestone

Status: **IN PROGRESS**

Implemented and verified locally:

- Server-backed onboarding draft synchronization with separate guest and account caches.
- Idempotent, transactional onboarding submission and 90-day plan activation.
- Private canonical mission templates; clients cannot choose mission XP.
- One server-authoritative begin, pause, resume, advance/complete, skip, and close-day command
  boundary with immutable retry receipts and no client-supplied XP.
- Day 90 can be sealed exactly once from the Today screen and records terminal completion.
- Account plan/execution restoration with revision-conflict refresh.
- PostgREST-safe HTTP 409 conflict handling verified by simultaneous onboarding-draft and repeated
  mission-command races; stale writes no longer trigger gateway retry timeouts.
- Lost command responses retry once with their original identity; persistent outages retain the last
  canonical cache and never claim speculative completion.
- Every plan is fixed to 90 real dates in its activation time zone. Missed dates expire without XP,
  reset the active streak, and cannot be reopened or bypassed by manual day jumps.
- 123 passing mobile tests, 15 passing domain tests, strict type-checks, 193 passing database
  assertions, passing confirmed-user Edge activation/replay and two-client API isolation tests, a
  populated six-migration upgrade test, generated-type equality, and clean local
  public/private-schema lint.

Remaining before this milestone is fully verified:

- Configure real SMTP with an authenticated sender domain and test real email journeys.
- Preserve the 18+ beta boundary and keep minor activation out of the v1.0 interface.
- Run the complete flow with two real hosted users and on two devices.
- Add durable offline mission mutation queue/retry; current offline support is read-only cached state.
