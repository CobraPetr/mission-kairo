import { Redirect, router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { useExecution } from '@/features/execution/execution-provider';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { usePlan } from '@/features/plan/plan-provider';
import { AppText, MonoLabel, SafeScreen, Stack } from '@/ui/primitives';

export default function DemoResetScreen() {
  const { developmentPreview } = useAuth();

  if (!developmentPreview) {
    return <Redirect href="/" />;
  }

  return <AllowedDemoResetScreen />;
}

function AllowedDemoResetScreen() {
  const { reset: resetExecution } = useExecution();
  const { resetDraft } = useOnboarding();
  const { reset: resetPlan } = usePlan();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function resetDemo() {
      await resetExecution();
      await resetPlan();
      await resetDraft();
      router.replace('/(auth)/welcome');
    }
    void resetDemo();
  }, [resetDraft, resetExecution, resetPlan]);

  return (
    <SafeScreen>
      <Stack gap="x3" style={{ flex: 1, justifyContent: 'center' }}>
        <MonoLabel color="accent">LOCAL DEMO // RESETTING</MonoLabel>
        <AppText variant="title">PREPARING MISSION ENTRY</AppText>
      </Stack>
    </SafeScreen>
  );
}
