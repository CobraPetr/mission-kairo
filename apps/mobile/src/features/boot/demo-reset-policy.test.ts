import { describe, expect, it } from 'vitest';

import { canRunDemoReset, type DemoResetRuntime } from './demo-reset-policy';

describe('demo reset policy', () => {
  it.each<DemoResetRuntime>([
    { appEnvironment: 'development', backendConfigured: true },
    { appEnvironment: 'preview', backendConfigured: false },
    { appEnvironment: 'preview', backendConfigured: true },
    { appEnvironment: 'production', backendConfigured: false },
    { appEnvironment: 'production', backendConfigured: true },
  ])('rejects $appEnvironment with backendConfigured=$backendConfigured', (runtime) => {
    expect(canRunDemoReset(runtime)).toBe(false);
  });

  it('allows only an unconfigured development preview', () => {
    expect(canRunDemoReset({ appEnvironment: 'development', backendConfigured: false })).toBe(true);
  });
});
