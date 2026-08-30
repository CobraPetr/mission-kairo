# Mission — Kairo store submission package

Release candidate: `1.0.0`

This document contains launch-ready copy. Values marked `OWNER REQUIRED` must be completed in the
store dashboards and must never be invented or committed as credentials.

## Product identity

- App name: `Mission — Kairo`
- iOS bundle identifier: `com.missionkairo.app`
- Android package name: `com.missionkairo.app`
- Category: Health & Fitness
- Public beta eligibility: adults aged 18 or older
- Subscription entitlement: `mission_kairo_pro`
- Monthly product: USD 29.99, localized by the store
- Annual product: USD 99.99, localized by the store
- Introductory offer: three-day free trial for eligible new subscribers

## Apple App Store copy

- Subtitle: `Your 90-Day Reset Protocol`
- Promotional text: `Turn your next 90 days into a private mission. Execute focused daily orders,
  build consistency, and track proof of progress.`
- Keywords: `discipline,habits,self improvement,fitness,confidence,goals,routine,focus,progress,90 day`

### Description

Mission — Kairo turns self-improvement into a private 90-day protocol.

Start with a focused assessment, choose the version of yourself you are working toward, and receive
a structured route built around daily execution. Every day has clear orders, visible progress, and a
defined finish line.

CORE FEATURES

- A cinematic, mission-style onboarding experience
- A deterministic 90-day roadmap based on your goals and current situation
- Focused daily missions across physical, mindset, confidence, and life-structure tracks
- XP, streaks, weekly consistency, and progress history
- Recovery-day and missed-day handling that follows real calendar dates
- Private account data with secure session and encrypted device storage
- Restore Purchases, Manage Subscription, and permanent in-app account deletion

Mission — Kairo provides general self-improvement structure. It is not medical, mental-health,
nutritional, financial, or relationship therapy. Adapt every activity to your health, environment,
and abilities.

Payment is charged to your Apple account after any eligible introductory trial. Subscriptions renew
automatically unless cancelled in your Apple subscription settings before renewal. Available plans,
localized prices, eligibility, and the next renewal date are shown before confirmation.

### Required URLs

- Privacy policy: `OWNER REQUIRED — public HTTPS URL`
- Terms of use: `OWNER REQUIRED — public HTTPS URL`
- Support: `OWNER REQUIRED — public HTTPS URL with verified operator contact`
- Marketing URL: optional

## Google Play copy

- Short description: `A private 90-day mission for discipline, confidence, and daily progress.`

### Full description

Mission — Kairo turns self-improvement into a private 90-day protocol.

Complete a focused assessment, choose your target, and follow a structured route of daily missions.
Build consistency through clear orders, XP, streaks, weekly progress, recovery days, and a visible
90-day finish line.

Mission — Kairo includes:

- Mission-style onboarding
- A goal-based 90-day roadmap
- Daily physical, mindset, confidence, and life-structure missions
- XP, streaks, and weekly consistency
- Secure account access and private progress data
- Purchase restoration and subscription management
- Permanent in-app account deletion

Mission — Kairo is a general self-improvement tool and is not medical or therapeutic advice.

Subscriptions renew automatically unless cancelled in Google Play before renewal. The purchase
screen displays the localized price, introductory-trial eligibility, and renewal terms before
confirmation.

## Apple App Privacy answers

The final answers must be reconciled against the submitted binary and current provider dashboards.

| Data type | Collected | Linked to user | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Email address | Yes | Yes | No | Authentication, account access, support |
| User ID / username | Yes | Yes | No | Account functionality |
| Fitness and body inputs, including weight | Yes | Yes | No | App functionality and personalization |
| User content / private onboarding answers | Yes | Yes | No | App functionality and personalization |
| Purchase history / entitlement status | Yes | Yes | No | Purchases and paid access |
| Product interaction and progress state | Yes | Yes | No | App functionality and analytics |
| Diagnostics | Yes | No custom account identity | No | App functionality and crash diagnosis |

Not collected in v1.0: precise location, contacts, advertising identifiers, public photos, chat
messages, AI conversation history, or data used for third-party advertising.

## Google Play disclosures

- Ads: No.
- Target audience: 18 and over.
- Health app declaration: general fitness/self-improvement; no medical diagnosis or treatment.
- Account creation: Yes.
- Account deletion: available inside Profile → Account; external deletion URL is `OWNER REQUIRED`.
- Data encrypted in transit: Yes.
- User can request deletion: Yes.
- Data sharing: Supabase, RevenueCat, Apple/Google payment infrastructure, and Expo Observe only for
  the declared service purposes; no sale and no targeted advertising.

## App Review notes

Mission — Kairo is a private 90-day self-improvement planner. It does not provide medical diagnosis,
therapy, public social features, unrestricted AI chat, or user-generated public content in v1.0.

Review path:

1. Launch the app and tap Accept Mission.
2. Complete onboarding, create an account, and verify the email address.
3. Review the generated protocol and activate it.
4. Use Today to begin and complete a mission.
5. Open Roadmap and Progress to inspect the protocol state.
6. Open Profile → Account to find Restore Purchases, Manage Subscription, legal documents, support,
   sign out, and Delete account.

Review account:

- Email: `OWNER REQUIRED`
- Password: `OWNER REQUIRED — enter only in App Store Connect, never in Git`

Subscription notes:

- Product access is controlled by the `mission_kairo_pro` RevenueCat entitlement.
- Restore Purchases is available before and after sign-in where applicable.
- Deleting the Mission Kairo account does not cancel the store-managed subscription; the deletion
  confirmation explains this distinction.

## Screenshot shot list

Capture these from the signed release candidate on a real supported device:

1. Classified mission landing screen.
2. Emotional onboarding question.
3. Generated identity card / protocol activation.
4. Today with daily orders.
5. 90-day roadmap.
6. Progress and weekly consistency.
7. Paywall showing live localized store products.

Do not submit screenshots containing development menus, placeholder prices, test email addresses,
private answers, or unsupported future features.
