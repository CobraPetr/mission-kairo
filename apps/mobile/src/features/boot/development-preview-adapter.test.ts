import { describe, expect, it } from 'vitest';

import { adaptAuthStatusForBoot, canUseGuestWorkspace } from './development-preview-adapter';

describe('adaptAuthStatusForBoot', () => {
  it.each(['loading', 'guest', 'authenticated', 'error'] as const)(
    'preserves the configured %s auth state',
    (status) => {
      expect(adaptAuthStatusForBoot(status, 'production')).toEqual({
        configuration: 'ready',
        developmentPreview: false,
        session: status,
      });
    },
  );

  it('provides the one explicit local-only preview adapter', () => {
    expect(adaptAuthStatusForBoot('unconfigured', 'development')).toEqual({
      configuration: 'ready',
      developmentPreview: true,
      session: 'guest',
    });
    expect(canUseGuestWorkspace('unconfigured', 'development')).toBe(true);
  });

  it.each(['preview', 'production'] as const)(
    'fails closed when the backend is unconfigured in %s',
    (environment) => {
      expect(adaptAuthStatusForBoot('unconfigured', environment)).toEqual({
        configuration: 'error',
        developmentPreview: false,
        session: 'error',
      });
      expect(canUseGuestWorkspace('unconfigured', environment)).toBe(false);
    },
  );
});
