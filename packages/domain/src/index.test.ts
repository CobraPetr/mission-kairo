import { describe, expect, it } from 'vitest';

import { calculateCompletionPercent, WINTER_ARC_DURATION_DAYS } from './index.ts';

describe('calculateCompletionPercent', () => {
  it('starts at zero and finishes at one hundred', () => {
    expect(calculateCompletionPercent(0)).toBe(0);
    expect(calculateCompletionPercent(WINTER_ARC_DURATION_DAYS)).toBe(100);
  });

  it('rounds progress to the nearest whole percent', () => {
    expect(calculateCompletionPercent(45)).toBe(50);
    expect(calculateCompletionPercent(1)).toBe(1);
  });

  it('clamps impossible values and rejects non-finite input', () => {
    expect(calculateCompletionPercent(-12)).toBe(0);
    expect(calculateCompletionPercent(120)).toBe(100);
    expect(calculateCompletionPercent(Number.NaN)).toBe(0);
  });
});
