# Winter Arc Production Build Checklist

Updated after every completed and verified task.

Legend:

- `[ ]` Not started
- `[-]` In progress
- `[x]` Implemented, checked, and free of known blocking defects
- `[!]` Blocked by an external account, credential, review, or decision

## Launch v1.0 decisions — approved 21 August 2026

- [x] Google Play developer account type: personal.
- [x] Public launch age: 14+.
- [x] Users aged 14–17 require verified guardian approval before protocol activation.
- [x] Phone/SMS verification is deferred to v1.1; v1.0 uses verified email.
- [x] Monthly subscription: USD 29.99.
- [x] Annual subscription: USD 99.99.
- [x] Introductory trial: 48 hours.
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
- [-] Step 5 — Finish hosted Supabase email delivery and auth configuration. The email-only client
  and server policy is locally verified and deployed; hosted SMTP, legal guardian design, and
  real-device email journeys remain external blockers.
- [-] Step 6 — Move portable rules and schemas into `packages/domain`. Generator v2, immutable
  seed/version metadata, server-only canonical activation, cross-runtime source policy, four-track
  golden fixtures, boundary/property tests, and the local Edge smoke test are implemented and
  verified. Review, merge, and explicit authorization for the hosted migration/function deployment
  remain.
- [ ] Step 7 — Reconcile and harden the normalized database invariants.
- [ ] Step 8 — Consolidate mission commands onto one idempotent, ledger-safe RPC path.
- [ ] Step 9 — Harden account-scoped repositories and cache validation.
- [ ] Step 10 — Add a durable offline mission-command queue.
- [ ] Step 11 — Complete remote synchronization and canonical conflict recovery.
- [ ] Step 12 — Finish username claiming and add localization architecture.
- [ ] Step 13 — Build missed-day, rest-day, and correct streak handling.
- [ ] Step 14 — Automate the core journey with Maestro.
- [ ] Step 15 — Pass the two-account by two-device verification matrix.
- [ ] Step 16 — Expand and calibrate the mission library.
- [ ] Step 17 — Remove or hide unfinished launch features.
- [ ] Step 18 — Configure App Store, Play, and RevenueCat products.
- [ ] Step 19 — Implement paywall, entitlement, Restore, and Manage Subscription.
- [ ] Step 20 — Pass the adversarial money-path test matrix.
- [ ] Step 21 — Publish lawyer-reviewed legal and support pages.
- [ ] Step 22 — Verify account deletion end to end for two complete accounts.
- [ ] Step 23 — Add privacy-safe crash reporting, analytics, icons, and splash.
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
- [x] Configure EAS.
  - [x] Development profile.
  - [x] Preview profile.
  - [x] Production profile.
  - [x] Development client dependency.
- [!] Create and verify an installable development build. Requires the owner's Expo account and platform signing credentials.
  - [!] iOS build.
  - [!] Android build.
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
- [x] Apply and test Row Level Security. All seven hosted migrations are current, all 88 pgTAP
      assertions pass locally, and the hosted `public` and `private` schemas pass strict lint.
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
- [!] Deploy generator v2 migration and `activate-protocol` Edge Function to the hosted development
  project after owner authorization and pull-request review.

## 6. Today and mission execution

- [x] Create Today query and view model.
- [x] Build the first-day state.
- [x] Build the normal daily state.
- [x] Build mission-in-progress state.
- [x] Build all-missions-complete state.
- [x] Build partial-day state.
- [ ] Build missed-day recovery state.
- [ ] Build rest-day state.
- [x] Build offline-cached state.
- [-] Build sync-conflict and server-error states. Canonical refresh and visible retry errors are implemented; native two-device UX verification remains.
- [x] Build mission briefing.
- [x] Build active mission steps.
- [x] Build pause and resume.
- [-] Build skip and reschedule. Skip is functional; rescheduling rules remain.
- [x] Create trusted mission-completion RPC with canonical server XP and idempotency.
- [x] Create append-only mission events.
- [x] Create XP ledger.
- [x] Implement idempotent event IDs.
- [x] Use server-authoritative completion and canonical refresh instead of speculative local XP.
- [ ] Implement offline mutation queue and retry.
- [x] Verify no mission or XP can complete twice.

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
- [ ] Configure RevenueCat development integration.
- [ ] Configure products and entitlements.
- [ ] Implement entitlement provider.
- [ ] Build paywall.
- [ ] Build Restore Purchases.
- [ ] Handle trial, active, grace, billing issue, and expired states.
- [ ] Add trusted purchase webhooks.
- [ ] Verify reinstall, logout, expiry, and restoration.

## 10. Quality and release

- [ ] Add privacy-safe analytics.
- [ ] Add crash reporting with data scrubbing.
- [ ] Add localization architecture.
- [ ] Add English copy.
- [ ] Add German layout-expansion testing.
- [ ] Add remaining launch languages.
- [ ] Complete accessibility audit.
- [ ] Complete reduced-motion audit.
- [ ] Complete performance audit.
- [ ] Complete offline audit.
- [!] Complete RLS and private-storage tests. Database/RLS behavior has 86 passing assertions; photo/private-object storage is not implemented yet.
- [ ] Complete end-to-end test suite.
- [ ] Test one real iPhone.
- [ ] Test one real Android device.
- [ ] Create internal iOS build.
- [ ] Create internal Android build.
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
