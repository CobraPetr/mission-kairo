# Mission — Kairo final release gate

Updated: 30 August 2026

## Verified complete

- [x] Release source is clean and locked at commit `841feac46ed108c81ad3895af2848cd044511e04`.
- [x] GitHub quality workflow is green for the release source.
- [x] 132 mobile tests and 15 domain tests pass.
- [x] Lint, strict type checking, formatting, static export, and 21/21 Expo Doctor checks pass.
- [x] iOS and Android JavaScript/native asset exports bundle successfully.
- [x] Supabase contains all 14 release migrations.
- [x] `delete-account` and `activate-protocol` are active in the hosted project.
- [x] Supabase production URL and publishable key are stored in the EAS production environment.
- [x] Hosted auth uses the `missionkairo://auth/callback` site URL and permits the callback and reset
      deep links.
- [x] Email signup and confirmation are enabled; phone authentication is disabled.
- [x] Exact-release Android development APK completed on EAS.
- [x] Store copy, review notes, privacy mapping, and screenshot shot list are prepared.

## Owner/account blockers

- [ ] Log in to RevenueCat and create/connect the Mission Kairo project, Apple app, and Google app.
- [ ] Create monthly and annual store subscriptions, a three-day trial, the
      `mission_kairo_pro` entitlement, and the current offering.
- [ ] Add RevenueCat public iOS/Android SDK keys to the EAS production environment.
- [ ] Add RevenueCat authorization and HMAC secrets to Supabase, deploy `revenuecat-webhook`, and
      pass the sandbox lifecycle matrix before enabling subscription enforcement.
- [ ] Configure a verified production SMTP sender and test signup, confirmation, resend, password
      reset, and recovery on real devices.
- [ ] Supply the verified legal operator name and public support contact; publish lawyer-reviewed
      Privacy, Terms, Support, and external account-deletion pages.
- [ ] Log in to the Apple Developer account, confirm `com.missionkairo.app`, and allow EAS to create
      the distribution certificate and provisioning profile.
- [ ] Create the App Store Connect app and complete agreements, tax, banking, privacy, age rating,
      review contact, and review account.
- [ ] Create the Play Console app and complete identity, payments, Data Safety, Health Apps,
      content rating, target audience, and account-deletion declarations.
- [ ] Enroll the personal Google Play developer account. Because it is being created after
      13 November 2023, complete a closed test with at least 12 continuously opted-in testers for
      14 days before applying for production access.

## Final hardware and money-path gate

- [ ] Signed iOS development build installed and exercised on a real iPhone.
- [ ] Signed Android build installed and exercised on a real Android device.
- [ ] Two accounts on two devices pass authentication, isolation, sync conflict, offline replay,
      restore, and account-deletion journeys.
- [ ] Apple sandbox passes trial, purchase, restore, reinstall, cancellation, billing retry, expiry,
      refund, and account deletion.
- [ ] Google Play sandbox passes trial, purchase, restore, reinstall, cancellation, grace, account
      hold, expiry, refund, and account deletion.
- [ ] Production AAB and IPA complete from the final approved commit.
- [ ] Store screenshots are captured from the signed release candidate.
- [ ] Production artifacts are uploaded and submitted with no open P0/P1 defect.

## Go / no-go rule

Submission is **NO-GO** while any owner/account blocker or money-path item above is incomplete.
Public availability is controlled by Apple and Google review after submission and cannot be promised
for a specific next-day time.
