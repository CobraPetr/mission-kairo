// @ts-expect-error Node types are intentionally absent from the mobile bundle; Vitest provides fs.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const productionAuthScreens = [
  '../../app/(auth)/sign-up.tsx',
  '../../app/(auth)/verify.tsx',
  '../../app/(auth)/verify-phone.tsx',
].map((path) => ({
  path,
  source: readFileSync(new URL(path, import.meta.url), 'utf8'),
}));

describe('development auth source policy', () => {
  it('keeps development configuration checks out of production auth screens', () => {
    for (const screen of productionAuthScreens) {
      expect(screen.source, screen.path).not.toMatch(
        /publicRuntimeConfig|isBackendConfigured|createDevelopmentAuthAdapter/,
      );
    }
  });

  it('forbids development bypass instructions in production auth screens', () => {
    for (const screen of productionAuthScreens) {
      expect(screen.source.toLowerCase(), screen.path).not.toMatch(
        /simulate verified|any six digits|local preview|dev \/\//,
      );
    }
  });

  it('never links a verification screen directly to protected app content', () => {
    const verificationScreens = productionAuthScreens.filter(({ path }) => path.includes('verify'));

    for (const screen of verificationScreens) {
      expect(screen.source, screen.path).not.toMatch(/router\.(?:push|replace)\('\/\(app\)/);
    }
  });
});
