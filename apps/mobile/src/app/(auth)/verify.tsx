import { router, useLocalSearchParams } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { publicRuntimeConfig } from '@/config/runtime';
import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import { colors, spacing } from '@/theme/tokens';
import { AppText, Button, SafeScreen, Stack } from '@/ui/primitives';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { resendVerification, status } = useAuth();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const isLocalDemo =
    publicRuntimeConfig.appEnvironment === 'development' && status === 'unconfigured';

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/(auth)/verify-phone');
    }
  }, [status]);

  async function resend() {
    if (!email) return;
    setError(undefined);
    setMessage(undefined);
    setLoading(true);
    try {
      await resendVerification(email);
      setMessage('A new secure link was sent.');
    } catch (resendError) {
      setError(getAuthErrorMessage(resendError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeScreen>
      <Stack gap="x5" style={styles.page}>
        <MailCheck color={colors.accent} size={38} strokeWidth={1.5} />
        <Stack gap="x3">
          <AppText variant="title">VERIFY YOUR EMAIL</AppText>
          <AppText color="textMuted" variant="body">
            Open the secure link in your inbox. Winter Arc will return here and continue
            automatically.
          </AppText>
        </Stack>
        <Button
          label="Return to access"
          onPress={() => router.replace('/(auth)/sign-in')}
          variant="secondary"
        />
        {email && !isLocalDemo ? (
          <Button
            label="Resend verification email"
            loading={loading}
            onPress={resend}
            variant="ghost"
          />
        ) : null}
        {message ? (
          <AppText color="success" variant="caption">
            {message}
          </AppText>
        ) : null}
        {error ? (
          <AppText accessibilityRole="alert" color="danger" variant="caption">
            {error}
          </AppText>
        ) : null}
        {isLocalDemo ? (
          <Stack gap="x2" style={styles.demoChannel}>
            <AppText color="textDim" variant="caption">
              Local preview only. This simulates the confirmation link until Supabase is connected.
            </AppText>
            <Button
              label="Dev // simulate verified email"
              onPress={() => router.replace('/(auth)/verify-phone')}
              variant="ghost"
            />
          </Stack>
        ) : null}
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.x8,
  },
  demoChannel: {
    paddingTop: spacing.x4,
  },
});
