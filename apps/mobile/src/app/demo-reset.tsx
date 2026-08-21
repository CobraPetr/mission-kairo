import { Redirect, router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { publicRuntimeConfig } from '@/config/runtime';
import { isBackendConfigured } from '@/data/supabase/client';
import { useExecution } from '@/features/execution/execution-provider';
import { canRunDemoReset } from '@/features/boot/demo-reset-policy';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { usePlan } from '@/features/plan/plan-provider';
import { AppText, MonoLabel, SafeScreen, Stack } from '@/ui/primitives';

export default function DemoResetScreen() {
  const resetAllowed = canRunDemoReset({
    appEnvironment: publicRuntimeConfig.appEnvironment,
    backendConfigured: isBackendConfigured,
  });

  if (!resetAllowed) {
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
