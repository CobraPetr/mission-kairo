import { router } from 'expo-router';
import { useState } from 'react';

import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import { getFieldIssue, newPasswordSchema } from '@/features/auth/auth-schemas';
import { AppText, Button, TextField } from '@/ui/primitives';
import { AuthFormScreen } from '@/ui/patterns/auth-form-screen';

export default function ResetPasswordScreen() {
  const { status, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [issues, setIssues] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    const result = newPasswordSchema.safeParse({ confirmPassword, password });
    if (!result.success) {
      setIssues({
        confirmPassword: getFieldIssue(result.error, 'confirmPassword'),
        password: getFieldIssue(result.error, 'password'),
      });
      return;
    }

    setIssues({});
    setFormError(undefined);
    setLoading(true);
    try {
      await updatePassword(result.data.password);
      router.replace('/');
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormScreen
      code="RECOVERY // 02"
      subtitle="Replace the compromised credential before the session can continue."
      title="SET NEW PASSWORD"
    >
      {status !== 'authenticated' ? (
        <AppText color="warning" variant="bodySmall">
          Waiting for the secure recovery link to establish your session.
        </AppText>
      ) : null}
      <TextField
        autoComplete="new-password"
        error={issues.password}
        label="New password"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      <TextField
        autoComplete="new-password"
        error={issues.confirmPassword}
        label="Confirm new password"
        onChangeText={setConfirmPassword}
        secureTextEntry
        value={confirmPassword}
      />
      {formError ? (
        <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
          {formError}
        </AppText>
      ) : null}
      <Button
        disabled={status !== 'authenticated'}
        label="Replace password"
        loading={loading}
        onPress={submit}
      />
    </AuthFormScreen>
  );
}
