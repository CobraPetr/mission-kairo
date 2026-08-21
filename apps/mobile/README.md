# Winter Arc mobile

Production iOS and Android application for the Winter Arc 90-day self-command protocol.

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

The application already contains the complete email-link and phone-code flows. To deliver real messages, connect a hosted Supabase project and configure its providers:

1. Copy the project URL and public publishable/anonymous key into a local `.env` using `.env.example`.
2. In Supabase Auth, enable Email with **Confirm email** turned on.
3. Configure a production SMTP provider and sender domain. Do not use Supabase's trial mailer for launch traffic.
4. Add `winterarc://auth/callback` and the deployed web callback URL to Auth redirect URLs.
5. Enable Phone Auth and connect an SMS provider such as Twilio, MessageBird, or Vonage.
6. Apply the migrations with `supabase db push`, then test signup, email confirmation, phone change, resend limits, and account deletion on real iOS and Android devices.

SMS provider secrets belong in Supabase only. Never add them to the Expo application or any `EXPO_PUBLIC_` variable.
