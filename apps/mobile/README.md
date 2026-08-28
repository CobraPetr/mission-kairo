# Mission — Kairo mobile

Production iOS and Android application for Mission — Kairo. Winter Arc is its first 90-day
self-command protocol.

## Local development

Run commands from the repository root:

```sh
pnpm --filter mobile start
pnpm --filter mobile ios
pnpm --filter mobile android
pnpm --filter mobile web
```

This application uses Expo Router and strict TypeScript. Product progress is tracked in the root `BUILD_CHECKLIST.md`.

## Hosted authentication setup

The application contains the complete verified-email authentication flow. To deliver real messages, connect the hosted Supabase project and configure its email provider:

1. Copy the project URL and public publishable/anonymous key into a local `.env` using `.env.example`.
2. In Supabase Auth, enable Email with **Confirm email** turned on.
3. Configure a production SMTP provider and sender domain. Do not use Supabase's trial mailer for launch traffic.
4. Add `missionkairo://auth/callback` and the deployed web callback URL to Auth redirect URLs.
5. Keep Phone Auth disabled for v1.0; verified email is the only activation identity.
6. Apply the migrations with `supabase db push`, then test signup, email confirmation, resend limits,
   password reset, and account deletion on real iOS and Android devices.

Provider credentials belong in Supabase only. Never add them to the Expo application or any
`EXPO_PUBLIC_` variable.
