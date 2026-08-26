// @ts-expect-error Node types are intentionally absent from the mobile bundle; Vitest provides fs.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const emailOnlySources = [
  '../../app/(onboarding)/identity.tsx',
  '../boot/canonical-route-gate.tsx',
  '../boot/development-preview-adapter.ts',
  '../boot/resolve-initial-route.ts',
  '../onboarding/onboarding-schema.ts',
  '../plan/protocol-activation.ts',
  './auth-provider.tsx',
  './auth-schemas.ts',
].map((path) => ({
  path,
  source: readFileSync(new URL(path, import.meta.url), 'utf8'),
}));

describe('email-only activation source policy', () => {
  it('keeps phone and SMS dependencies out of the active activation path', () => {
    for (const file of emailOnlySources) {
      expect(file.source, file.path).not.toMatch(/phone|verify-phone|sms/i);
    }
  });

  it('does not accept self-attested guardian approval', () => {
    for (const file of emailOnlySources) {
      expect(file.source, file.path).not.toContain('guardianConfirmed');
    }
  });
});
