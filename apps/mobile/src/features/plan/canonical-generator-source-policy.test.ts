// @ts-expect-error Node types are intentionally absent from the mobile bundle; Vitest provides fs.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const edgeFunctionSource = readFileSync(
  new URL('../../../../../supabase/functions/activate-protocol/index.ts', import.meta.url),
  'utf8',
);
const previewSource = readFileSync(new URL('./plan-provider.tsx', import.meta.url), 'utf8');

describe('canonical generator source policy', () => {
  it('uses the same portable domain generator for preview and server activation', () => {
    expect(previewSource).toContain("from '@winter-arc/domain'");
    expect(previewSource).toContain('generateWinterArcPlan');
    expect(edgeFunctionSource).toContain("from '../../../packages/domain/src/index.ts'");
    expect(edgeFunctionSource).toContain('generateWinterArcPlan(parsed.data.assessment)');
    expect(edgeFunctionSource).not.toContain('function generateWinterArcPlan');
  });
});
