import { useState } from 'react';

import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import { getFieldIssue, passwordResetSchema } from '@/features/auth/auth-schemas';
import { AppText, Button, TextField } from '@/ui/primitives';
import { AuthFormScreen } from '@/ui/patterns/auth-form-screen';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const result = passwordResetSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(getFieldIssue(result.error, 'email'));
      return;
    }

    setEmailError(undefined);
    setFormError(undefined);
    setLoading(true);
    try {
      await requestPasswordReset(result.data.email);
      setSent(true);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormScreen
      code="RECOVERY // 01"
      subtitle="If an account exists, a secure recovery link will be sent to it."
      title="RESTORE CREDENTIALS"
    >
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        error={emailError}
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        value={email}
      />
      {sent ? (
        <AppText accessibilityRole="alert" color="success" variant="bodySmall">
          Recovery instructions requested. Check your inbox and spam folder.
        </AppText>
      ) : null}
      {formError ? (
        <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
          {formError}
        </AppText>
      ) : null}
      <Button label="Send recovery link" loading={loading} onPress={submit} />
    </AuthFormScreen>
  );
}
