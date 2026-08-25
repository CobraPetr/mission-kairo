# Winter Arc release credentials runbook

This runbook lists the account-owned work that cannot be completed safely in source control. Do not paste passwords, signing keys, service-account JSON, Apple `.p8` files, Supabase service-role keys, RevenueCat secret keys, or provider tokens into the repository or any `EXPO_PUBLIC_` variable.

## 0. Repository prerequisite

The Git root is the shared workspace root. The application depends on `apps/mobile`, `packages/domain`, the root `pnpm-workspace.yaml`, and the root `pnpm-lock.yaml`, so CI and EAS archives must preserve that complete graph.

Before using CI or EAS Build:

1. Confirm the repository contains `apps/mobile`, `packages/domain`, `supabase`, `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`.
2. Keep the active workflow at root `.github/workflows/quality-gate.yml`; GitHub does not discover workflows nested under `apps/mobile`.
3. Keep `apps/mobile/.easignore`, `apps/mobile/eas.json`, and the Expo app configuration in the mobile app directory. Expo requires EAS commands to run from the app directory in a monorepo.
4. Test a fresh clone with `pnpm install --frozen-lockfile` and `pnpm validate`.
5. Push only to the approved private remote and require the root quality workflow on protected `main`.

Until the private remote and branch protection are configured, local validation cannot prove that protected CI is active.

## 1. Expo and EAS

Owner action:

1. Create or select the organization-owned Expo account.
2. From `apps/mobile`, run `npx eas-cli@latest login`.
3. Run `npx eas-cli@latest init` and select the correct Expo organization and project.
4. Review the generated `owner` and `extra.eas.projectId` values in the Expo app configuration before committing them. Do not invent or copy identifiers from another app.
5. In the EAS dashboard, create separate `development`, `preview`, and `production` environments.
6. Add the correct environment-specific public values:
   - `EXPO_PUBLIC_APP_ENV`
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
7. Do not put Supabase service-role keys, RevenueCat secret API keys, SMTP credentials, SMS credentials, Apple keys, or Google service-account files in public variables.
8. Run one signed development build per platform from `apps/mobile`:
   - `npx eas-cli@latest build --profile development --platform ios`
   - `npx eas-cli@latest build --profile development --platform android`
9. Install each result on a real device and complete the release test journeys before creating a production build.

## 2. Supabase

Owner action for each environment:

1. Create or select the Supabase project and record its project URL and public client key.
2. Link the local project with the Supabase CLI from the workspace root.
3. Review every migration, then apply migrations with `supabase db push`.
4. Run the database policy tests. Do not continue if any RLS or ownership test fails.
5. Enable email confirmation and configure a production SMTP provider and verified sender domain.
6. Enable phone authentication only after configuring the selected SMS provider in Supabase. Store the provider token in Supabase secrets, never in Expo.
7. Add the native authentication callback and deployed web callbacks to the Supabase redirect allow-list.
8. Deploy `delete-account` and any later purchase-webhook functions.
9. Add server-only function secrets with `supabase secrets set`; never commit their values.
10. Verify signup, email confirmation, phone verification, password reset, session refresh, sign-out, two-user isolation, and complete account deletion against the hosted project.

## 3. Apple Developer and App Store Connect

Owner action:

1. Enroll the owning legal person or organization in the Apple Developer Program and complete App Store Connect agreements, tax, and banking information.
2. Confirm ownership and availability of bundle identifier `com.winterarc.app` before the first signed production build.
3. Create the App Store Connect app record using that exact bundle identifier.
4. Create the auto-renewable subscription group and products. Record product identifiers in the release configuration; fetch localized prices from StoreKit/RevenueCat at runtime.
5. Create the App Store Connect API key used by RevenueCat or automated submission. Download the `.p8` file once and store it only in the approved secret manager/dashboard.
6. Let EAS manage signing credentials or upload approved certificates/profiles through the EAS credentials flow. Never commit signing material.
7. Add the public Privacy Policy, Terms of Use, support URL, and review contact.
8. Complete App Privacy disclosures for all app and third-party SDK data, including contact, fitness/weight, identifiers, purchases, product interaction, and diagnostics where applicable.
9. Complete the age-rating questionnaire and Health & Fitness declarations accurately.
10. Add a review account and precise review notes covering verification, the paywall, Restore Purchases, account deletion, and non-medical positioning.
11. Test purchases, cancellation, grace period, billing issue, expiration, and restoration in StoreKit/TestFlight sandbox before submission.

## 4. Google Play Console

Owner action:

1. Enroll the owning legal person or organization in Play Console and complete identity, payments, tax, and merchant setup.
2. Confirm ownership and availability of package name `com.winterarc.app` before the first production upload.
3. Create the Play Console app and complete the first required upload/setup interactively if Google has not yet enabled API-based submissions for the app.
4. Create subscription products and base plans. Keep product identifiers aligned with RevenueCat.
5. Create a least-privilege Google service account for RevenueCat/automated submission, grant only the required Play Console access, and store its JSON only in the provider secret store.
6. Complete Data Safety, the Health Apps declaration, Target Audience and Content, content rating, ads declaration, and the account-deletion URL.
7. Add the public Privacy Policy, Terms, support contact, and external account-deletion page.
8. Test purchases, cancellation, grace period, account hold, expiration, refund, and restoration with Play license testers on the Internal Testing track.

## 5. RevenueCat

Owner action:

1. Create the organization-owned RevenueCat project.
2. Add the App Store and Google Play applications with their real bundle/package identifiers.
3. Connect Apple and Google using the credentials stored directly in RevenueCat.
4. Import the store products and create one entitlement, for example `winter_arc_pro`, only after the final name is approved.
5. Create the current offering and attach monthly/annual packages selected by the owner.
6. Copy only the platform public SDK keys into their EAS environment values.
7. Configure a RevenueCat webhook to the deployed Supabase purchase-webhook function.
8. Store the webhook authorization/signing value only as a Supabase function secret.
9. Use the authenticated Supabase user UUID as RevenueCat `appUserID`; never use email, phone number, or a constant.
10. Verify purchase, restore, reinstall, second device, logout/login, cancellation, grace, billing issue, expiration, refund, and account deletion behavior in both store sandboxes.

## 6. Final release gate

The owner signs off only when all of the following are true:

- A fresh clone passes `pnpm install --frozen-lockfile` and `pnpm validate`.
- The GitHub quality gate passes from the complete monorepo checkout.
- EAS development and production builds succeed for iOS and Android.
- Supabase migrations and RLS tests pass against the linked environment.
- Email and SMS delivery work on real devices.
- RevenueCat entitlements survive reinstall and Restore Purchases.
- Account deletion clears server records, private files, device data, tokens, and analytics identity while clearly explaining store-managed subscription billing.
- Store privacy disclosures match the actual SDKs and data flows in the submitted binaries.
- No secret exists in Git history, an app bundle, logs, screenshots, or `EXPO_PUBLIC_` configuration.
