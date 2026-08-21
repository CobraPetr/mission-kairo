import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/auth-provider';
import { resolveInitialRoute } from '@/features/boot/resolve-initial-route';
import { useExecution } from '@/features/execution/execution-provider';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { usePlan } from '@/features/plan/plan-provider';

export default function BootResolverScreen() {
  const { status, user } = useAuth();
  const { hydrated: executionHydrated } = useExecution();
  const { draft, hydrated: onboardingHydrated } = useOnboarding();
  const { hydrated: planHydrated, state: planState } = usePlan();
  const route = resolveInitialRoute({
    execution: executionHydrated ? 'ready' : 'unknown',
    onboarding: !onboardingHydrated
      ? 'unknown'
      : draft.section === 'planPreview'
        ? 'complete'
        : 'required',
    phoneVerification: !user ? 'unknown' : user.phone_confirmed_at ? 'complete' : 'required',
    plan: !planHydrated ? 'unknown' : planState.status === 'ready' ? 'ready' : 'missing',
    session:
      status === 'loading' ? 'loading' : status === 'authenticated' ? 'authenticated' : 'guest',
  });

  return route ? <Redirect href={route} /> : null;
}
