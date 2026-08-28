import type { CustomerInfo } from 'react-native-purchases';

export const MISSION_KAIRO_ENTITLEMENT = 'mission_kairo_pro';

export type SubscriptionAccessState = 'unknown' | 'notEnforced' | 'required' | 'active';

export function hasMissionKairoAccess(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[MISSION_KAIRO_ENTITLEMENT]?.isActive === true;
}
