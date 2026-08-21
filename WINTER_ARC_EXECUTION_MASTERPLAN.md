# WINTER ARC EXECUTION MASTERPLAN

Status date: 21 August 2026

## 1. Product vision

Winter Arc is not another workout tracker. It is a private 90-day personal command system.

The product promise:

> Open the app, receive one clear order, execute it, record evidence, and move visibly closer to the person you chose to become.

The daily product loop is:

1. Briefing: one primary action is immediately visible.
2. Execution: the user completes a short physical, mindset, presence, career, relationship, or recovery mission.
3. Evidence: completion is recorded privately and cannot be forged by changing a local number.
4. Progression: XP, route position, streak, and weekly review update from trusted events.
5. Return trigger: the next mission and reminder create a reason to return tomorrow.

The product must feel cinematic at earned moments such as mission acceptance, identity fabrication, checkpoints, and sector completion. Everyday use must remain fast, calm, and task-first.

The business model is a consumer subscription. The proposed initial price is approximately $24.99 per month, with an annual plan tested separately. The app must not charge until account restoration, deletion, subscription restoration, and cross-device progress are reliable.

## 2. Mastermind council and tool roles

### Codex

- Owns the working Expo/React Native repository.
- Implements frontend, domain, Supabase migrations, tests, and release configuration.
- Runs lint, type, unit, build, and live end-to-end verification after every tranche.

### Claude

- Acts as the adversarial reviewer.
- Its completed six-agent review identified routing, data-loss, execution, security, persistence, accessibility, and build defects.
- Claude should review each completed P0/P1 tranche when its usage window is available again.

### Rork

- The signed-in Rork workspace offers separate SwiftUI/iPhone, Kotlin/Android, and Vite/web project paths; it does not continue the existing Expo repository as one shared codebase.
- The Rork Max path is Apple-native and SwiftUI-based. It is not the primary build path because Winter Arc must keep one tested iOS/Android product core.
- Use Rork Max later for bounded Apple-native experiments: Live Activities, widgets, Apple Watch, Dynamic Island, and native motion studies.
- Do not fork the core product into independent Swift and Expo implementations before product-market fit.
- A bounded `WINTER ARC // COMMAND LAB` project is active in Rork as a motion reference only: ultra-minimal globe, thin stat lines, a mission briefing sheet, and a three-second boot reveal.

### Required service stack

- Supabase: authentication, Postgres, RLS, Edge Functions, Storage, Realtime later.
- RevenueCat: App Store and Play subscriptions, entitlement restoration, billing state.
- Sentry: privacy-scrubbed crash and performance reporting.
- PostHog: opt-in, typed funnel analytics without private answer content.
- Expo/EAS: development builds, TestFlight, Play Internal Testing, store builds.
- Maestro: native end-to-end regression journeys.

External plugins are useful only after the corresponding owner accounts are connected. They do not replace SDK integration in the app.

## 3. Non-negotiable product rules

- Users are 14 or older. Teen privacy and consent require legal review before a public paid launch.
- No shame, attractiveness scores, body ranking, humiliation, or manipulative purchase copy.
- Emotional answers, body measurements, relationships, phone numbers, photos, and exact goals are private.
- Public competition never exposes private missions, photos, location, or measurements.
- XP is awarded only by a trusted server operation using canonical mission data.
- The client never submits an XP amount.
- Account deletion removes server records, private files, device tokens, analytics identity, and local cache.
- Social chat, leaderboard, public photos, and unrestricted AI remain disabled until their moderation and minor-safety systems exist.

## 4. Target architecture

```text
Expo screens and components
        |
Feature hooks and commands
        |
Repository contracts
        |
+----------------------+----------------------+
| User-scoped cache    | Supabase repositories|
| Offline queue        | Authenticated RPCs    |
+----------------------+----------------------+
        |
Canonical Postgres plan, progress, events, XP ledger
```

Required repository contracts:

- `OnboardingRepository`
- `ProfileRepository`
- `PlanRepository`
- `ExecutionRepository`
- `SubscriptionRepository`

Local storage is a user-keyed cache, never the authority. Example key:

`winterarc:{authUserId}:execution:v2`

Queued execution mutations contain only:

- canonical mission ID
- client-generated idempotency UUID
- expected server revision
- client timestamp

They never contain XP or public leaderboard totals.

## 5. Execution phases

### Phase P0: stop data loss, security defects, and broken execution

Goal: the current local app becomes logically safe before backend expansion.

- [x] Reject imperial measurements that normalize outside persisted metric bounds.
- [x] Add boundary regression tests for 7 ft 7 in and 77 lb.
- [x] Wire the boot resolver into the real root route.
- [x] Remove the web reload redirect that forced users back to Welcome.
- [x] Add a protected app-layout auth gate.
- [x] Resume an existing onboarding draft instead of erasing it on Accept Mission.
- [x] Define completed and skipped missions as resolved for day sealing.
- [x] Move mission advance and day seal decisions into pure state transitions.
- [x] Serialize execution commands and disable buttons while a command is committing.
- [x] Make Progress read the active seven-day sector instead of week one.
- [x] Stop labeling a weekly count as a true streak until sealed-day history exists.
- [x] Restrict auth links to exact configured callback destinations.
- [x] Remove raw access-token session replacement and retain PKCE code exchange only.
- [x] Normalize Supabase Auth phone values before writing E.164 profile data.
- [x] Support phone removal and already-confirmed phone creation.
- [x] Replace obsolete Supabase local mail configuration.
- [x] Remove stale Vite JavaScript artifacts that shadow TypeScript configuration.
- [x] Persist local consent state and an acceptance timestamp.
- [x] Add screen-reader grouping to the mission dial and command card.
- [x] Make status badges use symbols and text color, not border color alone.
- [x] Prevent web haptic calls.
- [x] Add scalable line-height calculation and verification at 100%, 150%, and 200% system text sizes.
- [x] Add explicit sealed-day records to execution state.
- [x] Derive a true streak from sealed-day history.

Exit gate:

- All unit tests pass.
- Web and Expo exports build.
- Live flow passes: Welcome, resumed onboarding, plan, card, auth gate, mission, skip, seal, week rollover.

### Phase P1: user-scoped identity and persistence foundation

Goal: a second account or device can never inherit another user's Winter Arc.

Frontend work:

- [x] Add `src/data/repositories/` contracts and tested user-scoped cache-key rules.
- [ ] Move direct AsyncStorage access out of the four providers.
- [ ] Create a guest onboarding workspace with an explicit claim operation after account verification.
- [ ] Scope every authenticated cache key by Supabase user UUID.
- [ ] Cancel queries and unload memory immediately when the authenticated user changes.
- [x] Clear onboarding, plan, and execution cache on explicit sign-out and deletion.
- [ ] Add a bootstrap query that restores profile, onboarding status, active plan, execution, entitlement, and pending mutations.
- [ ] Show skeleton states while bootstrap is authoritative.
- [ ] Remove every dev bypass from production screens and place mock auth behind one adapter.

Backend work:

- [x] Add `onboarding_drafts` with revision-based updates.
- [x] Add immutable `onboarding_submissions`.
- [x] Add `plans`, `plan_days`, and `plan_missions`.
- [x] Add `arc_executions`, `mission_progress`, and `day_progress`.
- [x] Add append-only `mission_events` and `xp_ledger`.
- [x] Add composite ownership foreign keys on all plan and execution children.
- [x] Add RLS for own-row reads and deny direct writes to canonical XP.
- [x] Add `save_onboarding_draft` with expected revision.
- [ ] Add a username availability and reservation operation.
- [ ] Move final card fabrication after callsign reservation succeeds.
- [ ] Add `activate_protocol` as an authenticated Edge Function using the shared domain package.
- [ ] Add trusted begin, advance, pause, resume, skip, complete, and seal operations.
- [x] Make mission completion idempotent by `(user_id, client_event_id)` and award canonical server XP.

Exit gate:

- Account A cannot read Account B's cache or rows.
- A new device restores the same plan, active day, completed missions, XP, and subscription.
- Offline completion retries once and awards XP once.

### Phase P2: deepen the paid core product

Goal: the 90-day experience is worth a recurring subscription.

- [ ] Expand the mission library from roughly ten templates to at least 35 reviewed templates.
- [ ] Make base track materially change physical progression.
- [ ] Use target build, target weight direction, confidence focus, career goal, and relationship goal in mission selection.
- [ ] Add progressive difficulty bands for days 1–21, 22–45, 46–70, and 71–90.
- [ ] Add missed-day recovery without shame or automatic streak destruction.
- [ ] Add explicit rest-day variants.
- [ ] Add reschedule rules and a visible reason for skipped work.
- [ ] Add weekly review inputs and real recalibration rules.
- [ ] Remove any copy promising adaptation until the adaptation path is implemented.
- [ ] Render the full 90-day route using virtualized sectors.
- [ ] Auto-scroll to the current day and collapse completed sectors.
- [ ] Add private weekly photos only after Storage policies and deletion are verified.

Exit gate:

- Four consecutive weeks do not feel like the same seven days repeated.
- Every collected onboarding field either affects the product or is removed.
- Weekly review produces an explainable adjustment.

### Phase P3: subscription and retention systems

Goal: users can pay, restore, cancel through the store, and retain access correctly.

RevenueCat structure:

- Entitlement: `winter_arc_pro`
- Monthly and annual products
- Supabase UUID as RevenueCat App User ID
- Server webhook event table with idempotency
- Server-side entitlement snapshot for support and access decisions

Frontend states:

- [ ] Loading offering
- [ ] Trial eligible
- [ ] Purchase in progress
- [ ] Active
- [ ] Grace period
- [ ] Billing issue
- [ ] Expired
- [ ] Restored
- [ ] Purchase cancelled or failed

Required screens and controls:

- [ ] Paywall after plan preview and verified account, before premium Today.
- [ ] Restore Purchases on paywall and Account.
- [ ] Manage Subscription in Account.
- [ ] Store-localized prices only.
- [ ] Clear billing frequency, renewal, trial conversion, cancellation, Terms, and Privacy.

Notifications:

- [ ] Ask permission only after the user selects a reminder.
- [ ] Store timezone and reminder preferences.
- [ ] Use neutral lock-screen text such as “Your daily briefing is ready.”
- [ ] Remove device tokens on sign-out and deletion.

Exit gate:

- Purchase, restore, second-device restore, grace, billing issue, and expiry pass in both sandboxes.

### Phase P4: observability, privacy, and release engineering

Sentry:

- [ ] Initialize with `sendDefaultPii: false`.
- [ ] Disable replay initially.
- [ ] Scrub tokens, names, email, phone, age, measurements, answers, goals, relationships, and photo paths.
- [ ] Upload source maps for EAS releases.
- [ ] Add a root error boundary and release/environment tags.

PostHog:

- [ ] Disable autocapture and replay.
- [ ] Add typed events for funnel facts only.
- [ ] Never send answer text, body values, relationship data, photos, or chat content.
- [ ] Delete the analytics identity during account deletion.

Release engineering:

- [ ] Make the workspace root the Git and EAS project root.
- [x] Add app-root `.easignore` rules that preserve the complete monorepo graph.
- [x] Add a CI quality gate that refuses to report green while the Git root is incorrectly nested.
- [ ] Link EAS owner and project ID.
- [ ] Create distinct development, preview, and production variants.
- [ ] Fail production builds when Supabase or RevenueCat configuration is absent.
- [ ] Replace all default Expo icons and splash assets.
- [ ] Create support, Privacy, Terms, and external deletion pages.
- [ ] Produce installable development builds for one real iPhone and one real Android device.
- [ ] Create TestFlight and Play Internal Testing releases.

Mandatory Maestro journeys:

1. Fresh install through plan generation.
2. Interrupted onboarding and exact resume.
3. Email callback and phone verification.
4. Hostile or malformed auth link rejection.
5. Skip then seal a day.
6. Rapid-tap protection.
7. Offline completion then successful synchronization.
8. Account A sign-out followed by Account B login.
9. Current-week rollover at days 7, 8, 84, 85, and 90.
10. Purchase success, cancellation, failure, and restore.
11. Second-device subscription and progress restore.
12. Account deletion while subscribed.
13. Minor consent path.

### Phase P5: later social and AI systems

Do not begin until P0–P4 are stable.

AI Drill Sergeant:

- Trusted server gateway only.
- Age-aware safety policy.
- No medical diagnosis, eating-disorder coaching, harassment, sexual content involving minors, or coercive relationship advice.
- Cost limits, rate limits, refusal tests, and human-readable escalation paths.

Leaderboard:

- Weekly divisions and trusted score snapshots.
- Server XP only.
- Anti-cheat review.
- Public username and safe aggregate progress only.

Worldwide chat:

- Rate limits, reports, blocks, mute, room moderation, spam control, minor-safety rules, and human moderation operations.
- No private photo or location posting at launch.

## 6. Database blueprint

Core tables:

- `profiles_public`
- `profiles_private`
- `onboarding_drafts`
- `onboarding_submissions`
- `plans`
- `plan_days`
- `plan_missions`
- `arc_executions`
- `mission_progress`
- `day_progress`
- `mission_events`
- `xp_ledger`
- `subscription_entitlements`
- `subscription_webhook_events`
- `notification_preferences`
- `device_tokens`

Later tables:

- `weekly_reviews`
- `progress_photos`
- `challenges`
- `challenge_memberships`
- `challenge_events`
- `leaderboard_snapshots`
- `chat_rooms`
- `chat_messages`
- `chat_reports`
- `user_blocks`

Every table requires explicit grants, RLS, ownership tests, and deletion behavior before the client uses it.

## 7. Launch decision

The safe 1 September target is a controlled founder beta, not a paid public launch.

Paid launch requires all of the following:

- Live Supabase and real email/SMS delivery.
- User-scoped cross-device persistence.
- Trusted mission completion and XP.
- RevenueCat purchase and restore on both stores.
- Complete account deletion.
- Privacy and Terms pages.
- Crash reporting and minimal privacy-safe analytics.
- One real iPhone and Android test pass.
- TestFlight and Play Internal Testing completion.
- Teen/privacy and fitness-content review.

## 8. Immediate next build order

1. Promote the workspace to one real Git root without losing the existing mobile history.
2. Implement repository adapters and replace device-global provider storage.
3. Add the authenticated activation transaction and remaining execution RPCs.
4. Test live email, two-user isolation, deletion, and cross-device restoration; add SMS after choosing a provider.
5. Add RevenueCat only after restoration works.
6. Add observability, E2E, assets, legal pages, and store submission.

## 9. Verified implementation snapshot

Completed on 21 August 2026:

- Full formatting, lint, strict TypeScript, unit, web production build, and Expo web export pass.
- 72 automated TypeScript tests pass across the mobile app and shared domain package.
- Live browser QA passes for Landing, Accept Mission, question submission/transition, and Restore Access.
- PostgreSQL parsing and embedded migration application pass for the persistence migration.
- Backend behavioral smoke passes for RLS isolation, draft revision conflicts, trusted XP, idempotent retry, cross-user rejection, and account-deletion cascade.
- The hosted Supabase project is linked, all four migrations are current, and the delete-account Edge Function is active.
- All 50 pgTAP assertions pass against the isolated Supabase stack; the hosted public schema passes strict lint.
