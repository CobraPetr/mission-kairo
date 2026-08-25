import { router } from 'expo-router';
import { useState } from 'react';

import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import { getFieldIssue, signInSchema } from '@/features/auth/auth-schemas';
import { AppText, Button, TextField } from '@/ui/primitives';
import { AuthFormScreen } from '@/ui/patterns/auth-form-screen';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      setEmailError(getFieldIssue(result.error, 'email'));
      setPasswordError(getFieldIssue(result.error, 'password'));
      return;
    }

    setEmailError(undefined);
    setPasswordError(undefined);
    setFormError(undefined);
    setLoading(true);
    try {
      await signIn(result.data.email, result.data.password);
      router.replace('/');
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormScreen
      code="ACCESS // RETURNING"
      footer={
        <Button
          label="Create new profile"
          onPress={() => router.replace('/(auth)/sign-up')}
          variant="ghost"
        />
      }
      subtitle="Continue the protocol from the exact point you left it."
      title="RESTORE ACCESS"
    >
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        error={emailError}
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        textContentType="emailAddress"
        value={email}
      />
      <TextField
        autoComplete="current-password"
        error={passwordError}
        label="Password"
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        value={password}
      />
      {formError ? (
        <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
          {formError}
        </AppText>
      ) : null}
      <Button label="Enter command center" loading={loading} onPress={submit} />
      <Button
        label="Forgot password"
        onPress={() => router.push('/(auth)/forgot-password')}
        variant="ghost"
      />
    </AuthFormScreen>
  );
}
