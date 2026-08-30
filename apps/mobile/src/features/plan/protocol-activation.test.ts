import { describe, expect, it } from 'vitest';

import { resolveDeviceTimeZone } from './device-time-zone';

describe('protocol activation runtime context', () => {
  it('always supplies a non-empty IANA-compatible time-zone value', () => {
    expect(resolveDeviceTimeZone()).toMatch(/^[A-Za-z0-9_+\-/]+$/);
  });
});
