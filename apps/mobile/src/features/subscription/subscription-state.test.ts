import { describe, expect, it } from 'vitest';

import { hasMissionKairoAccess, MISSION_KAIRO_ENTITLEMENT } from './subscription-state';

describe('hasMissionKairoAccess', () => {
  it('grants access only for the active canonical entitlement', () => {
    expect(
      hasMissionKairoAccess({
        entitlements: {
          active: { [MISSION_KAIRO_ENTITLEMENT]: { isActive: true } },
        },
      } as never),
    ).toBe(true);
    expect(hasMissionKairoAccess({ entitlements: { active: {} } } as never)).toBe(false);
    expect(
      hasMissionKairoAccess({
        entitlements: {
          active: { another_entitlement: { isActive: true } },
        },
      } as never),
    ).toBe(false);
  });
});
