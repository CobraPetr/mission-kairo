import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { AppText, MonoLabel, SafeScreen, Stack } from '@/ui/primitives';

export default function AuthCallbackScreen() {
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/(auth)/verify-phone');
    }
  }, [status]);

  return (
    <SafeScreen>
      <Stack gap="x3" style={{ flex: 1, justifyContent: 'center' }}>
        <MonoLabel color="accent">Secure channel</MonoLabel>
        <AppText variant="title">VERIFYING ACCESS</AppText>
        <AppText color="textMuted" variant="bodySmall">
          Keep Winter Arc open while the encrypted session is completed.
        </AppText>
      </Stack>
    </SafeScreen>
  );
}
