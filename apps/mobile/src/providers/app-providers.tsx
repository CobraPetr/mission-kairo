import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/features/auth/auth-provider';
import { publicRuntimeConfig } from '@/config/runtime';
import { isBackendConfigured } from '@/data/supabase/client';
import { createDevelopmentAuthAdapter } from '@/features/boot/development-preview-adapter';
import { ExecutionProvider } from '@/features/execution/execution-provider';
import { OnboardingProvider } from '@/features/onboarding/onboarding-provider';
import { PlanProvider } from '@/features/plan/plan-provider';
import { SubscriptionProvider } from '@/features/subscription/subscription-provider';

const developmentAuthAdapter = createDevelopmentAuthAdapter({
  appEnvironment: publicRuntimeConfig.appEnvironment,
  backendConfigured: isBackendConfigured,
});

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider developmentAdapter={developmentAuthAdapter}>
            <SubscriptionProvider>
              <OnboardingProvider>
                <PlanProvider>
                  <ExecutionProvider>{children}</ExecutionProvider>
                </PlanProvider>
              </OnboardingProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
