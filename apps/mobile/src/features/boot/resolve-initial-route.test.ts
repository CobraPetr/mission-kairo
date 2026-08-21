import { describe, expect, it } from 'vitest';

import { resolveInitialRoute } from './resolve-initial-route';

describe('resolveInitialRoute', () => {
  const ready = {
    execution: 'ready' as const,
    onboarding: 'complete' as const,
    phoneVerification: 'complete' as const,
    plan: 'ready' as const,
    session: 'authenticated' as const,
  };

  it('waits while the session is loading', () => {
    expect(resolveInitialRoute({ ...ready, session: 'loading' })).toBeNull();
  });

  it('sends guests to the classified welcome', () => {
    expect(resolveInitialRoute({ ...ready, session: 'guest' })).toBe('/(auth)/welcome');
  });

  it('sends authenticated recruits through unfinished onboarding', () => {
    expect(resolveInitialRoute({ ...ready, onboarding: 'required' })).toBe('/(onboarding)');
  });

  it('opens Today only after onboarding is complete', () => {
    expect(resolveInitialRoute(ready)).toBe('/(app)/today');
  });

  it('waits for every authenticated boot dependency to hydrate', () => {
    expect(resolveInitialRoute({ ...ready, onboarding: 'unknown' })).toBeNull();
    expect(resolveInitialRoute({ ...ready, plan: 'unknown' })).toBeNull();
    expect(resolveInitialRoute({ ...ready, execution: 'unknown' })).toBeNull();
  });

  it('enforces phone verification before entering the protocol', () => {
    expect(resolveInitialRoute({ ...ready, phoneVerification: 'required' })).toBe(
      '/(auth)/verify-phone',
    );
  });

  it('regenerates a missing plan before opening Today', () => {
    expect(resolveInitialRoute({ ...ready, plan: 'missing' })).toBe('/(onboarding)/plan-preview');
  });
});
