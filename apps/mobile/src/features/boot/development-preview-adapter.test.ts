import { describe, expect, it } from 'vitest';

import {
  adaptAuthStatusForBoot,
  canUseGuestWorkspace,
  createDevelopmentAuthAdapter,
} from './development-preview-adapter';

describe('adaptAuthStatusForBoot', () => {
  it.each(['loading', 'guest', 'authenticated', 'error'] as const)(
    'preserves the configured %s auth state',
    (status) => {
      expect(adaptAuthStatusForBoot(status, false)).toEqual({
        configuration: 'ready',
        developmentPreview: false,
        session: status,
      });
    },
  );

  it('provides the one explicit local-only preview adapter', () => {
    const adapter = createDevelopmentAuthAdapter({
      appEnvironment: 'development',
      backendConfigured: false,
    });

    expect(adapter.enabled).toBe(true);
    expect(adapter.handle('signUp')).toBe(true);
    expect(adapter.handle('verifyPhoneVerification')).toBe(true);
    expect(adapter.continuationAfter('refreshSession')).toBe('/(auth)/verify-phone');
    expect(adapter.continuationAfter('verifyPhoneVerification')).toBe('/(app)/today');
    expect(adaptAuthStatusForBoot('unconfigured', adapter.enabled)).toEqual({
      configuration: 'ready',
      developmentPreview: true,
      session: 'guest',
    });
    expect(canUseGuestWorkspace('unconfigured', adapter.enabled)).toBe(true);
  });

  it.each([
    ['development', true],
    ['preview', false],
    ['preview', true],
    ['production', false],
    ['production', true],
  ] as const)(
    'fails closed outside an unconfigured local development build (%s, backend=%s)',
    (appEnvironment, backendConfigured) => {
      const adapter = createDevelopmentAuthAdapter({ appEnvironment, backendConfigured });

      expect(adapter.enabled).toBe(false);
      expect(adapter.handle('signUp')).toBe(false);
      expect(adapter.continuationAfter('refreshSession')).toBeNull();
      expect(adapter.continuationAfter('verifyPhoneVerification')).toBeNull();
      expect(adaptAuthStatusForBoot('unconfigured', adapter.enabled)).toEqual({
        configuration: 'error',
        developmentPreview: false,
        session: 'error',
      });
      expect(canUseGuestWorkspace('unconfigured', adapter.enabled)).toBe(false);
    },
  );
});
