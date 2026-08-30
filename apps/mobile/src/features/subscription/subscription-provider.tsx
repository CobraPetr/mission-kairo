import type { PurchasesPackage } from 'react-native-purchases';
import Purchases from 'react-native-purchases';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { publicRuntimeConfig } from '@/config/runtime';
import { useAuth } from '@/features/auth/auth-provider';

import { hasMissionKairoAccess, type SubscriptionAccessState } from './subscription-state';

type SubscriptionContextValue = {
  access: SubscriptionAccessState;
  busy: boolean;
  error?: string;
  packages: PurchasesPackage[];
  manage(): Promise<void>;
  purchase(selectedPackage: PurchasesPackage): Promise<boolean>;
  refresh(): Promise<void>;
  restore(): Promise<boolean>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);
let configuredUserId: string | null = null;

function publicPurchaseError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Store access is temporarily unavailable. Check your connection and try again.';
}

function isCancelledPurchase(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

function platformApiKey(): string | undefined {
  if (Platform.OS === 'ios') return publicRuntimeConfig.revenueCatIosKey;
  if (Platform.OS === 'android') return publicRuntimeConfig.revenueCatAndroidKey;
  return undefined;
}

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { status: authStatus, user } = useAuth();
  const apiKey = platformApiKey();
  const enforceAccess = Boolean(apiKey);
  const [access, setAccess] = useState<SubscriptionAccessState>(
    enforceAccess ? 'unknown' : 'notEnforced',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  const applyCustomerInfo = useCallback(
    (customerInfo: Awaited<ReturnType<typeof Purchases.getCustomerInfo>>) => {
      setAccess(hasMissionKairoAccess(customerInfo) ? 'active' : 'required');
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!enforceAccess || !apiKey) {
      setAccess('notEnforced');
      setPackages([]);
      setError(undefined);
      return;
    }
    if (authStatus !== 'authenticated' || !user) {
      setAccess('unknown');
      setPackages([]);
      return;
    }

    setError(undefined);
    try {
      const configured = await Purchases.isConfigured();
      if (!configured) {
        Purchases.configure({
          apiKey,
          appUserID: user.id,
          automaticDeviceIdentifierCollectionEnabled: false,
          diagnosticsEnabled: false,
        });
        configuredUserId = user.id;
      } else if (configuredUserId !== user.id) {
        await Purchases.logIn(user.id);
        configuredUserId = user.id;
      }

      const [customerInfo, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      applyCustomerInfo(customerInfo);
      const current = offerings.current;
      setPackages(
        current
          ? [current.annual, current.monthly].filter(
              (candidate): candidate is PurchasesPackage => candidate !== null,
            )
          : [],
      );
    } catch (reason) {
      setAccess('required');
      setPackages([]);
      setError(publicPurchaseError(reason));
    }
  }, [apiKey, applyCustomerInfo, authStatus, enforceAccess, user]);

  useEffect(() => {
    const bootstrap = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(bootstrap);
  }, [refresh]);

  useEffect(() => {
    if (!enforceAccess) return;
    const listener = (customerInfo: Awaited<ReturnType<typeof Purchases.getCustomerInfo>>) => {
      applyCustomerInfo(customerInfo);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [applyCustomerInfo, enforceAccess]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      access,
      busy,
      error,
      async manage() {
        if (!enforceAccess) return;
        setError(undefined);
        try {
          await Purchases.showManageSubscriptions();
        } catch (reason) {
          setError(publicPurchaseError(reason));
          throw reason;
        }
      },
      packages,
      async purchase(selectedPackage) {
        setBusy(true);
        setError(undefined);
        try {
          const result = await Purchases.purchasePackage(selectedPackage);
          applyCustomerInfo(result.customerInfo);
          return hasMissionKairoAccess(result.customerInfo);
        } catch (reason) {
          if (isCancelledPurchase(reason)) return false;
          setError(publicPurchaseError(reason));
          throw reason;
        } finally {
          setBusy(false);
        }
      },
      refresh,
      async restore() {
        setBusy(true);
        setError(undefined);
        try {
          const customerInfo = await Purchases.restorePurchases();
          applyCustomerInfo(customerInfo);
          return hasMissionKairoAccess(customerInfo);
        } catch (reason) {
          setError(publicPurchaseError(reason));
          throw reason;
        } finally {
          setBusy(false);
        }
      },
    }),
    [access, applyCustomerInfo, busy, enforceAccess, error, packages, refresh],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider.');
  return context;
}
