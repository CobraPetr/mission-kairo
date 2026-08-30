# Mission — Kairo Production Build Checklist

Updated after every completed and verified task.

Legend:

- `[ ]` Not started
- `[-]` In progress
- `[x]` Implemented, checked, and free of known blocking defects
- `[!]` Blocked by an external account, credential, review, or decision

## Launch v1.0 decisions — updated 30 August 2026

- [x] Google Play developer account type: personal.
- [x] Public beta activation age: 18+.
- [x] Minor accounts are out of scope for v1.0; no guardian workflow ships in the beta.
- [x] Phone/SMS verification is deferred to v1.1; v1.0 uses verified email.
- [x] Monthly subscription: USD 29.99.
- [x] Annual subscription: USD 99.99.
- [x] Introductory trial: three days, matching the store-supported minimum.
- [x] No lifetime purchase in v1.0.
- [!] Determine whether the personal Play account was created after 13 November 2023. If so, start the required 12-tester/14-day closed test and treat the public launch as iOS-first.

## Launch v1.0 gated execution

- [x] Step 1 — Protect existing history and create one root Git repository.
  - [x] Preserve the former nested mobile repository under ignored `.git-safety/` storage.
  - [x] Create one root repository containing mobile, domain, Supabase, workspace, and product documentation.
  - [x] Verify that environment files, signing credentials, generated output, and duplicate export folders are excluded.
  - [x] Create the protected snapshot and `launch/v1.0` branch.
  - [x] Pass a frozen install and the complete validation chain from a clean clone: 80 mobile tests, 9 domain tests, formatting, Vite build, and 63-route Expo export.
- [-] Step 2 — Separate the approved web prototype from the production workspace. Implemented on the
  launch branch; pull request #1 still requires an independent approval before merge.
- [-] Step 3 — Finish the boot resolver, route guards, and safe resume behavior. Implemented and
  native-Maestro verified on pull request #2; merge remains stacked behind Step 2.
- [-] Step 4 — Consolidate the development authentication bypass. Implemented on pull request #3;
  merge remains stacked behind Step 3.
- [-] Step 5 — Finish hosted Supabase email delivery and auth configuration. The email-only client,
  database policy, 13 migrations, and both Edge Functions are deployed; hosted SMTP, dashboard
  redirect verification, and real-device email journeys remain external blockers.
- [-] Step 6 — Move portable rules and schemas into `packages/domain`. Generator v2, immutable
  seed/version metadata, server-only canonical activation, cross-runtime source policy, four-track
  golden fixtures, boundary/property tests, and the local Edge smoke test are implemented and
  verified and deployed to the hosted development project. Review and merge remain.
- [-] Step 7 — Reconcile and harden the normalized database invariants. Shared bounds, 90-day and
  daily-schedule constraints, forward-only status transitions, canonical XP derivation, drift
  detection/repair, generated-type equality, six-migration upgrade preservation, and two-client API
  isolation are locally verified, and the hosted migration history now matches all 13 local
  migrations. Review and merge remain.
- [-] Step 8 — Consolidate mission commands onto one idempotent, ledger-safe RPC path. The single
  UUID/timestamp/revision command contract, immutable replay receipts, canonical ledger award,
  retired legacy completion paths, mobile-issued command identities, and 193 database assertions
  are locally verified and deployed. The real-API race harness passes repeatedly; pull-request
  review and the rerun of the hardened CI gate remain.
- [x] Step 9 — Harden account-scoped repositories and cache validation. Onboarding, plan, execution,
      and pending-command data use validated owner-scoped keys; private native caches migrate into
      device-bound encrypted storage.
- [x] Step 10 — Add a durable offline mission-command queue. Failed authenticated commands retain
      their original UUID, timestamp, revision, and target in encrypted owner-scoped storage; no local
      XP or speculative completion is granted.
- [x] Step 11 — Complete remote synchronization and canonical conflict recovery. Pending commands
      replay with their original identity, lost responses resolve through the receipt, and stale queued
      work is discarded in favor of canonical server state.
- [-] Step 12 — Finish username claiming and add localization architecture. Atomic normalized
  username claiming is verified; localization architecture remains.
- [x] Step 13 — Build missed-day, rest-day, and correct streak handling. Real calendar dates,
      activation-time-zone anchoring, missed-day expiry, streak reset, no-speed-running behavior, and a
      dedicated lower-intensity recovery-day presentation are verified.
- [ ] Step 14 — Automate the core journey with Maestro.
- [ ] Step 15 — Pass the two-account by two-device verification matrix.
- [ ] Step 16 — Expand and calibrate the mission library.
- [x] Step 17 — Remove or hide unfinished launch features. Challenges redirect to Today even by
      deep link; social chat, leaderboard, public photos, and unrestricted AI have no launch route; the
      UI lab and demo reset fail closed outside development.
- [-] Step 18 — Configure App Store, Play, and RevenueCat products. The private server entitlement
  ledger, signed/idempotent webhook handler, out-of-order event protection, and fail-closed mission
  enforcement switch are implemented and locally verified. Store records, RevenueCat project,
  secrets, webhook deployment, and products remain external.
- [-] Step 19 — Implement paywall, entitlement, Restore, and Manage Subscription. The native
  RevenueCat provider, UUID identity, localized offering UI, hard route gate, restore, management,
  cancellation handling, and production fail-closed configuration are implemented and tested in
  source. Real store products, SDK keys, and sandbox device verification remain.
- [ ] Step 20 — Pass the adversarial money-path test matrix. Local webhook authentication,
      idempotency, lifecycle-state, stale-event, and enforcement tests pass; real sandbox store cases
      remain.
- [!] Step 21 — Publish lawyer-reviewed legal and support pages. In-app privacy, terms, and support
  drafts exist and production builds now require public HTTPS URLs. Verified operator contact,
  hosting, and legal review remain owner/external work.
- [ ] Step 22 — Verify account deletion end to end for two complete accounts.
- [-] Step 23 — Add privacy-safe crash reporting, analytics, icons, and splash. The custom Kairo
  insignia, opaque iOS icon, adaptive Android assets, splash, favicon, production-only Expo Observe
  JavaScript error reporting, render recovery boundary, and performance telemetry are implemented.
  Native crash capture and dashboard verification remain.
- [ ] Step 24 — Complete both store listings and privacy disclosures.
- [ ] Step 25 — Build, test, upload, and submit the production artifacts.
- [ ] Step 26 — Complete the internal beta and blocking-defect burn-down.
- [ ] Step 27 — Add the daily reminder only if Steps 1–26 are green.
- [ ] Step 28 — Complete the final go/no-go and rollback plan.

## 0. Build control

- [x] Create the master execution blueprint.
- [x] Create this persistent checkbox checklist.
- [x] Confirm the approved web prototype remains unchanged.
- [x] Record the approved visual fidelity contract.
- [x] Keep this checklist synchronized after every task.

## 1. Native foundation

- [x] Create `apps/mobile` using the current Expo Router TypeScript template.
  - [x] Inspect the generated files.
  - [x] Remove unused demo routes and assets.
  - [x] Confirm the app starts without dependency errors.
- [x] Configure the pnpm workspace.
  - [x] Add `apps/*` and `packages/*` workspace patterns.
  - [x] Validate the workspace lockfile.
- [x] Create `packages/domain`.
  - [x] Enable strict TypeScript.
  - [x] Export one tested domain entry point.
- [x] Configure strict project quality.
  - [x] TypeScript strict mode.
  - [x] ESLint.
  - [x] Prettier.
  - [x] Unit test runner.
  - [x] Root scripts for lint, typecheck, test, and build validation.
- [x] Configure runtime environments.
  - [x] Add environment schema validation.
  - [x] Add safe public configuration boundaries.
  - [x] Add `.env.example` without secrets.
- [x] Configure Expo application metadata.
  - [x] Application name and slug.
  - [x] iOS bundle identifier.
  - [x] Android package identifier.
  - [x] Scheme and deep-link configuration.
  - [x] Version and build-number policy.
  - [x] Mission — Kairo product name, scheme, bundle identifiers, and package identifier.
  - [x] Set the launch-facing application version to 1.0.0.
- [x] Configure EAS.
  - [x] Development profile.
  - [x] Preview profile.
  - [x] Production profile.
  - [x] Development client dependency.
- [-] Create and verify installable development builds.
  - [!] iOS build. Expo is linked, but Apple internal-distribution credentials and a registered test
    device must be completed interactively by the owner.
  - [x] Android build. Signed APK build `68a28f83-06d7-43b4-98f7-64f12387195c` finished on EAS.
  - [!] Real-device launch check.

## 2. Application shell and design system

- [x] Implement root provider order.
- [x] Implement native splash and boot resolver.
- [x] Implement authenticated, onboarding, and application route groups.
- [x] Implement the five-tab shell.
- [x] Implement feature flags with safe disabled defaults.
- [x] Create theme tokens.
  - [x] Colors.
  - [x] Typography.
  - [x] Spacing.
  - [x] Radius.
  - [x] Motion.
  - [x] Elevation. Deliberately flat: separation uses contrast and borders, not decorative shadows.
- [x] Create UI primitives.
  - [x] Screen and SafeScreen.
  - [x] Stack and Inline.
  - [x] Text and MonoLabel.
  - [x] Button and IconButton.
  - [x] TextField and TextArea.
  - [x] ProgressLine and StatusBadge.
  - [x] Skeleton, EmptyState, ErrorState, and Toast.
- [x] Verify primitives.
  - [x] Default state.
  - [x] Pressed state.
  - [x] Focused state.
  - [x] Disabled state.
  - [x] Loading state.
  - [x] Error state.
  - [x] Large text.
  - [x] Screen reader labels.
  - [x] Reduced motion.

## 3. Backend and authentication

- [x] Create and link the `winter-arc-development` Supabase project in Frankfurt.
- [x] Configure the React Native Supabase client.
- [x] Configure secure session persistence.
- [x] Create initial database migrations.
- [x] Create `profiles_public`.
- [x] Create `profiles_private`.
- [x] Create automatic profile initialization.
- [x] Apply and test Row Level Security. All 13 hosted migrations are current, all 193 pgTAP
      assertions pass locally, and the `public` and `private` schemas pass strict lint.
- [x] Implement authentication state provider.
- [x] Implement sign up.
- [x] Implement email-link verification, resend, and deep-link callback.
- [x] Remove phone fields, SMS screens, phone claims, and SMS methods from the v1 activation path.
- [x] Disable phone signup and phone confirmation in the local Supabase v1 configuration.
- [x] Require verified email for activation in both the native route gate and database RPC.
- [x] Reject under-14 activation and reject self-attested guardian approval server-side.
- [!] Design and legally approve a verified guardian workflow for ages 14–17 before enabling minor
  activation. The current client and server intentionally fail closed.
- [!] Configure production SMTP with an authenticated sender domain. Requires the owner's provider
  account, DNS records, and credentials.
- [x] Implement sign in.
- [x] Implement password reset.
- [x] Implement sign out.
- [x] Implement session expiry recovery.
- [x] Implement account deletion.
- [!] Verify every authentication journey and error state. The project and delete-account function
  are live; signup, resend, reset, expiry, rate limiting, session restoration, and deletion still
  require real hosted email and iOS/Android device testing.

## 4. Native onboarding

- [x] Port the approved landing screen.
- [x] Port the cinematic typed introduction.
- [x] Port the five emotional questions.
- [x] Build identity and unit questions.
- [x] Build current-situation questions.
- [x] Build sport and activity questions.
- [x] Build physical self-description selection.
- [x] Build relationship-status selection.
- [x] Build Winter Arc goal questions.
- [x] Build target-build selection.
- [x] Build target-weight input.
- [x] Build confidence and communication goals.
- [x] Build education or career goals.
- [x] Build relationship goals.
- [x] Build final answer review.
- [x] Implement Zod validation for every field.
- [x] Implement encrypted native draft persistence with scoped SecureStore chunks and migration away from the old plain cache.
- [x] Implement server draft persistence with scoped device caches, guest-to-account claiming, revision reconciliation, and offline pending sync.
- [x] Return simultaneous onboarding draft conflicts as immediate HTTP 409 responses and verify the
      two-client race without gateway retries.
- [x] Implement exact-section resume.
- [x] Implement canonical unit normalization.
- [x] Submit a versioned immutable onboarding snapshot as part of idempotent protocol activation.
- [-] Verify restart, offline, long-answer, keyboard, and back-navigation behavior. Restart, long-answer growth/reset, keyboard layout, and web back-navigation pass; native offline verification remains.

## 5. Domain and deterministic plan generation

- [x] Create domain models.
- [x] Create state machines.
- [x] Create goal and capability schemas.
- [x] Create mission-template schema.
- [x] Create mission-step schema.
- [x] Create the reviewed mission seed library.
- [x] Implement assessment normalization.
- [x] Implement capability-profile derivation.
- [x] Implement base-track selection.
- [x] Implement the 90-day base calendar.
- [x] Implement the 80/20 personalization rule.
- [x] Implement recovery and checkpoint insertion.
- [x] Implement workload and safety validation.
- [x] Implement XP-range calculation.
- [x] Implement atomic plan persistence.
- [x] Make generator v2 and its reviewed seed version explicit and restorable.
- [x] Use the same portable generator source in the native preview and server activation runtime.
- [x] Revoke authenticated access to the legacy SQL generator and accept manifests only through the
      service-role activation boundary.
- [x] Build the plan-generation state.
- [x] Build the plan preview.
- [x] Verify deterministic output, byte-stable plan identity, all four base tracks, boundary inputs,
      schedule validity, workload properties, and safety rules.
- [x] Exercise confirmed-user activation and idempotent replay through the local Edge runtime.
- [x] Deploy generator v2 migrations and the `activate-protocol` Edge Function to the hosted
      development project.
- [x] Centralize age, measurement, duration, XP, step, daily-count, and workload bounds for client
      schemas and database constraints.
- [x] Enforce exact 90-day calendars, valid daily schedules, timestamp order, and forward-only plan,
      day, mission, and execution transitions.
- [x] Derive public XP through serialized canonical ledger deltas and provide private drift detection
      and repair.
- [x] Verify the forward migration preserves a populated six-migration plan, database types have no
      generated diff, and two authenticated API clients cannot cross account boundaries.

## 6. Today and mission execution

- [x] Create Today query and view model.
- [x] Build the first-day state.
- [x] Build the normal daily state.
- [x] Build mission-in-progress state.
- [x] Build all-missions-complete state.
- [x] Allow Day 90 to be sealed once and hide the final action after completion.
- [x] Build partial-day state.
- [x] Build missed-day state with expired missions, streak reset, and a non-actionable Today view.
- [x] Build recovery-day state with distinct instructions and safe lower-intensity framing.
- [x] Build offline-cached state.
- [-] Build sync-conflict and server-error states. Canonical refresh and visible retry errors are implemented; native two-device UX verification remains.
- [x] Build mission briefing.
- [x] Build active mission steps.
- [x] Build pause and resume.
- [-] Build skip and reschedule. Skip is functional; rescheduling rules remain.
- [x] Consolidate begin, pause, resume, advance/complete, skip, and close-day mutations behind one
      authenticated command RPC.
- [x] Require a client UUID, expected revision, canonical target, and bounded client timestamp for
      every authenticated mutation.
- [x] Persist immutable replay receipts so identical retries return their original response and
      mismatched reuse fails closed.
- [x] Retire the competing completion RPC and the old non-idempotent command signature.
- [x] Create trusted mission-completion handling with canonical server XP and idempotency.
- [x] Create append-only mission events.
- [x] Create XP ledger.
- [x] Use the client command UUID as the stable event identity and generate it once per user action.
- [x] Use server-authoritative completion and canonical refresh instead of speculative local XP.
- [x] Retry a lost command response once with the same identity, preserve the canonical cache during
      an outage, and surface failure without speculative completion.
- [x] Implement an encrypted, account-scoped offline mutation queue and retry with stable command
      identity, restart recovery, duplicate prevention, and canonical stale-command recovery.
- [x] Verify no mission or XP can complete twice through pgTAP replay, rapid-tap, stale-revision,
      cross-user-target, receipt-immutability, and ledger-total checks.
- [x] Verify simultaneous live API commands locally. The automated same-key, different-key,
      lost-response, stale-write, and concurrent-completion race harness passes repeatedly without
      duplicated XP or gateway timeouts.
- [x] Anchor every protocol to 90 real calendar dates in the user's activation time zone.
- [x] Keep sealed days on screen until the next assigned date; never unlock tomorrow early.
- [x] Expire unresolved past days as missed, close their missions without XP, and reset the streak.
- [x] Prevent manual day jumps and make repeated calendar synchronization idempotent.

## 7. Roadmap and challenges

- [x] Create Roadmap view model.
- [ ] Build virtualized weekly or sector rendering.
- [ ] Build local topographic route connections.
- [x] Build current, completed, available, and locked nodes.
- [ ] Implement current-day auto-scroll.
- [ ] Implement completed-sector collapse.
- [ ] Implement reduced-motion behavior.
- [ ] Create challenge content tables.
- [ ] Build Available challenges.
- [ ] Build Active challenges.
- [ ] Build Completed challenges.
- [ ] Implement join, abandon, step completion, and claim.
- [ ] Reuse trusted mission and XP infrastructure.
- [ ] Verify long roadmaps, state changes, and challenge expiry.

## 8. Progress and Profile

- [x] Create progress-entry storage.
- [ ] Build daily check-in.
- [x] Build weekly consistency.
- [ ] Build category progress.
- [ ] Build weekly review.
- [ ] Create private Storage bucket.
- [ ] Create photo access policies.
- [ ] Build photo permission flow.
- [ ] Build selection and capture.
- [ ] Remove unnecessary metadata where possible.
- [ ] Resize and compress locally.
- [ ] Upload to a private user path.
- [ ] Display through authenticated access.
- [ ] Delete photo and metadata.
- [x] Build public-safe profile fields.
- [x] Build private progress fields.
- [ ] Verify photo privacy and deletion with two separate users.

## 9. Notifications and subscriptions

- [ ] Build notification preference storage.
- [ ] Build permission request at the correct moment.
- [ ] Build morning, mission, evening, weekly, and challenge reminders.
- [ ] Implement safe lock-screen copy.
- [ ] Implement notification deep links.
- [-] Configure RevenueCat development integration. SDK integration plus a private server
  entitlement ledger and authenticated webhook handler are complete; dashboard project, store
  connections, offerings, public platform keys, webhook secrets, and hosted deployment remain.
- [ ] Configure products and entitlements.
- [x] Implement entitlement provider using the authenticated Supabase UUID and canonical
      `mission_kairo_pro` entitlement.
- [x] Build localized monthly/annual paywall with explicit renewal copy and three-day trial framing.
- [x] Build Restore Purchases and Manage Subscription.
- [-] Handle trial, active, grace, billing issue, and expired states. The server ledger maps and
  tests these lifecycle states; live client/store verification remains.
- [-] Add trusted purchase webhooks. HMAC plus authorization-header verification, idempotent event
  receipts, alias/original-user resolution, timestamp replay protection, and out-of-order protection
  are implemented and locally tested. RevenueCat configuration and production secrets remain.
- [ ] Verify reinstall, logout, expiry, and restoration.

## 10. Quality and release

- [x] Add production-only privacy-safe startup/performance telemetry without account identifiers or
      private-answer attributes.
- [-] Add crash reporting with data scrubbing. Expo Observe captures production JavaScript/render
  errors without custom user attributes; native crashes and live-dashboard verification remain.
- [ ] Add localization architecture.
- [ ] Add English copy.
- [ ] Add German layout-expansion testing.
- [ ] Add remaining launch languages.
- [ ] Complete accessibility audit.
- [ ] Complete reduced-motion audit.
- [ ] Complete performance audit.
- [-] Complete offline audit. Read-only cache fallback and durable command replay are implemented;
  native airplane-mode and reconnect testing remains.
- [!] Complete RLS and private-storage tests. Database/RLS behavior has 193 passing assertions;
  photo/private-object storage is not implemented yet.
- [ ] Complete end-to-end test suite.
- [ ] Test one real iPhone.
- [ ] Test one real Android device.
- [ ] Create internal iOS build.
- [x] Create internal Android build.
- [ ] Run beta and resolve every blocking defect.
- [ ] Prepare App Store metadata and privacy disclosures.
- [ ] Prepare Play Store metadata and privacy disclosures.
- [ ] Submit production builds.

## 11. Later: AI Sergeant

- [ ] Create trusted server AI gateway.
- [ ] Implement context minimization.
- [ ] Implement structured prompts and responses.
- [ ] Implement safety evaluation.
- [ ] Implement limits and cost controls.
- [ ] Implement transparent AI labeling.
- [ ] Implement failure and escalation states.
- [ ] Replace RulesCoachService with AiCoachService behind the interface.
- [ ] Verify safety, privacy, latency, cost, and response quality.

## 12. Later: live leaderboard

- [ ] Create weekly divisions.
- [ ] Create trusted score snapshots.
- [ ] Add anti-cheat protections.
- [ ] Add privacy-safe public profiles.
- [ ] Add realtime updates.
- [ ] Add rank movement and weekly reset.
- [ ] Verify ranking correctness and privacy.

## 13. Later: worldwide chat

- [ ] Create rooms and memberships.
- [ ] Create realtime messages.
- [ ] Add rate limits and spam protection.
- [ ] Add reporting.
- [ ] Add blocking.
- [ ] Add automated moderation.
- [ ] Add human moderation queue.
- [ ] Add minor-safety rules.
- [ ] Add deletion and retention rules.
- [ ] Verify abuse, spam, privacy, reporting, blocking, and escalation flows.
