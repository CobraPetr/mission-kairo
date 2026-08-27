// @ts-expect-error Node types are intentionally absent from the mobile bundle; Vitest provides fs.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const providerSource = readFileSync(new URL('./plan-provider.tsx', import.meta.url), 'utf8');

describe('plan provider hydration policy', () => {
  it('marks initial loads and activation refreshes with the complete hydration key', () => {
    expect(providerSource.match(/setHydratedOwner\(hydrationKey\)/g)).toHaveLength(2);
    expect(providerSource).not.toContain('setHydratedOwner(ownerId)');
  });
});
