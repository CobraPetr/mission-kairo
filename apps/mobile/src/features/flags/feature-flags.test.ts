import { describe, expect, it } from 'vitest';

import { featureFlags, isFeatureEnabled } from './feature-flags';

describe('feature flags', () => {
  it('keeps unfinished network features disabled by default', () => {
    expect(featureFlags).toEqual({
      aiCoach: false,
      liveLeaderboard: false,
      worldwideChat: false,
    });
    expect(isFeatureEnabled('aiCoach')).toBe(false);
  });
});
