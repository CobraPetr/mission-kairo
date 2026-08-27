import { describe, expect, it } from 'vitest';

import { createServiceNumber } from './service-number';

describe('createServiceNumber', () => {
  it('creates a stable non-sensitive service number', () => {
    expect(createServiceNumber('winter_recruit')).toBe(createServiceNumber('winter_recruit'));
    expect(createServiceNumber('winter_recruit')).toMatch(/^MK-01-\d{4}-\d{4}$/);
  });

  it('normalizes whitespace and casing', () => {
    expect(createServiceNumber('  CobraPetr ')).toBe(createServiceNumber('cobrapetr'));
  });
});
