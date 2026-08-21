import { describe, expect, it } from 'vitest';

import { resolveTextLineScale } from './text-scale';

describe('resolveTextLineScale', () => {
  it.each([
    [1, 1],
    [1.5, 1.5],
    [2, 2],
  ])('keeps line height aligned at %sx system text', (fontScale, expected) => {
    expect(resolveTextLineScale(fontScale, true, 2)).toBe(expected);
  });

  it('respects an explicit platform scale cap', () => {
    expect(resolveTextLineScale(2, true, 1.8)).toBe(1.8);
  });

  it('keeps the base line height when font scaling is disabled', () => {
    expect(resolveTextLineScale(2, false, 2)).toBe(1);
  });
});
