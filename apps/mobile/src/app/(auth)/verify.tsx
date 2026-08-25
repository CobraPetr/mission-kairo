import { router, useLocalSearchParams } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import { colors, spacing } from '@/theme/tokens';
import { AppText, Button, SafeScreen, Stack } from '@/ui/primitives';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { refreshSession, resendVerification, status } = useAuth();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function checkStatus() {
    setError(undefined);
    setMessage(undefined);
    setLoading(true);
    try {
      const continuation = await refreshSession();
      if (continuation) {
        router.replace(continuation);
      } else {
        setError('The email has not been verified yet. Open the link, then check again.');
      }
    } catch (refreshError) {
      setError(getAuthErrorMessage(refreshError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
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
        <Button label="Check verification status" loading={loading} onPress={checkStatus} />
        {email ? (
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
});
