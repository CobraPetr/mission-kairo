import { describe, expect, it } from 'vitest';

import { buildScopedCacheKey, GUEST_WORKSPACE_ID } from './cache-scope';

describe('buildScopedCacheKey', () => {
  it('keeps guest onboarding separate from authenticated data', () => {
    expect(buildScopedCacheKey(GUEST_WORKSPACE_ID, 'onboarding', 2)).toBe(
      'winterarc:guest:onboarding:v2',
    );
    expect(buildScopedCacheKey('user-a', 'onboarding', 2)).not.toBe(
      buildScopedCacheKey('user-b', 'onboarding', 2),
    );
  });

  it('rejects an unowned or unversioned cache key', () => {
    expect(() => buildScopedCacheKey(' ', 'plan', 1)).toThrow();
    expect(() => buildScopedCacheKey('user-a', 'plan', 0)).toThrow();
  });
});
