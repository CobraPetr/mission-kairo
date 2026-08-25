import { Redirect, useSegments } from 'expo-router';
import { type PropsWithChildren, useMemo } from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { useExecution } from '@/features/execution/execution-provider';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { resolveOnboardingResumeRoute } from '@/features/onboarding/resolve-onboarding-route';
import { usePlan } from '@/features/plan/plan-provider';
import { AppText, ErrorState, MonoLabel, SafeScreen, Stack } from '@/ui/primitives';

import { adaptAuthStatusForBoot } from './development-preview-adapter';
import {
  classifyRoute,
  resolveRouteAccess,
  type BootSnapshot,
  type GuardianApprovalState,
  type OnboardingRoute,
} from './resolve-initial-route';

function guardianApprovalState(
  hydrated: boolean,
  age: number | null,
  guardianConfirmed: boolean,
): GuardianApprovalState {
  if (!hydrated || age === null) return 'unknown';
  if (age >= 18) return 'notRequired';
  return guardianConfirmed ? 'approved' : 'required';
}

export function CanonicalRouteGate({ children }: PropsWithChildren) {
  const segments = useSegments();
  const { authFlow, developmentPreview, status, user } = useAuth();
  const {
    hydrated: onboardingHydrated,
    hydrationError: onboardingHydrationError,
    retryHydration: retryOnboardingHydration,
    draft,
  } = useOnboarding();
  const {
    activated,
    hydrated: planHydrated,
    hydrationError: planHydrationError,
    retryHydration: retryPlanHydration,
    state: planState,
  } = usePlan();
  const {
    hydrated: executionHydrated,
    hydrationError: executionHydrationError,
    retryHydration: retryExecutionHydration,
  } = useExecution();

  const auth = adaptAuthStatusForBoot(status, developmentPreview);
  const onboardingRoute = onboardingHydrated
    ? ((resolveOnboardingResumeRoute(draft) ?? '/(onboarding)') as OnboardingRoute)
    : null;
  const onboardingComplete =
    onboardingHydrated && draft.section === 'planPreview' && draft.consent.confirmedAt !== null;
  const workspaceError = onboardingHydrationError || planHydrationError || executionHydrationError;

  const snapshot = useMemo<BootSnapshot>(
    () => ({
      activation: !planHydrated
        ? 'unknown'
        : auth.session === 'authenticated'
          ? activated
            ? 'complete'
            : 'required'
          : planState.status === 'ready'
            ? 'complete'
            : 'required',
      appReadiness: executionHydrated ? 'ready' : 'unknown',
      authFlow,
      configuration: auth.configuration,
      developmentPreview: auth.developmentPreview,
      emailVerification:
        auth.session !== 'authenticated' || !user
          ? 'unknown'
          : user.email_confirmed_at
            ? 'complete'
            : 'required',
      entitlement: 'notEnforced',
      guardianApproval: guardianApprovalState(
        onboardingHydrated,
        draft.identity.age,
        draft.consent.guardianConfirmed,
      ),
      onboarding: !onboardingHydrated ? 'unknown' : onboardingComplete ? 'complete' : 'required',
      onboardingRoute,
      phoneVerification:
        auth.session !== 'authenticated' || !user
          ? 'unknown'
          : user.phone_confirmed_at
            ? 'complete'
            : 'required',
      session: auth.session,
      workspaceSafety: workspaceError ? 'error' : 'ready',
    }),
    [
      auth.configuration,
      auth.developmentPreview,
      auth.session,
      authFlow,
      activated,
      draft.consent.guardianConfirmed,
      draft.identity.age,
      executionHydrated,
      onboardingComplete,
      onboardingHydrated,
      onboardingRoute,
      planHydrated,
      planState.status,
      user,
      workspaceError,
    ],
  );
  const decision = resolveRouteAccess(snapshot, classifyRoute(segments));

  if (decision.action === 'redirect') return <Redirect href={decision.route} />;

  if (decision.action === 'hold') {
    return (
      <SafeScreen testID={`boot-loading-${decision.phase}`}>
        <Stack gap="x3" style={{ flex: 1, justifyContent: 'center' }}>
          <MonoLabel color="accent">SECURE STARTUP // {decision.phase.toUpperCase()}</MonoLabel>
          <AppText variant="title">RESTORING MISSION STATE</AppText>
          <AppText color="textMuted" variant="bodySmall">
            Verifying the active account before any private content is displayed.
          </AppText>
        </Stack>
      </SafeScreen>
    );
  }

  if (decision.action === 'error') {
    const canRetry = decision.phase === 'workspaceSafety';
    return (
      <SafeScreen testID={`boot-error-${decision.phase}`}>
        <Stack style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorState
            actionLabel={canRetry ? 'Retry secure startup' : undefined}
            message={decision.reason}
            onAction={
              canRetry
                ? () => {
                    retryOnboardingHydration();
                    retryPlanHydration();
                    retryExecutionHydration();
                  }
                : undefined
            }
            title="STARTUP BLOCKED"
          />
        </Stack>
      </SafeScreen>
    );
  }

  return children;
}
