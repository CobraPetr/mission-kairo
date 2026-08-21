import { describe, expect, it } from 'vitest';

import { createEmptyOnboardingDraft } from './onboarding-schema';
import { resolveOnboardingResumeRoute } from './resolve-onboarding-route';

describe('onboarding resume route', () => {
  it('plays the cinematic intro for an untouched draft', () => {
    expect(resolveOnboardingResumeRoute(createEmptyOnboardingDraft())).toBeNull();
  });

  it('returns directly to the exact saved section', () => {
    expect(
      resolveOnboardingResumeRoute({
        ...createEmptyOnboardingDraft(),
        section: 'targetWeight',
      }),
    ).toBe('/(onboarding)/target-weight');
  });
});
