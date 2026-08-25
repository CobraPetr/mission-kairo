# Mission — Kairo

Production workspace for the Mission — Kairo Expo application, shared plan domain, and Supabase backend.

## Workspace

- `apps/mobile` — Expo Router application for iOS, Android, and web
- `packages/domain` — portable plan-generation and mission-state rules
- `supabase` — migrations, database tests, and Edge Functions

The obsolete standalone Vite onboarding prototype was removed from the production workspace at Gate 2. It remains recoverable from Git history at commit `a37827f`.

## Local development

Install the exact dependency graph and start Expo from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Run the complete source, test, export, and Expo compatibility checks with:

```sh
pnpm validate
```

Database tests run against an isolated local Supabase stack through the root GitHub quality workflow. Never run destructive reset commands against the linked hosted project.
