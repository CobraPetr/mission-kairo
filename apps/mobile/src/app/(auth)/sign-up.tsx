import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import { getFieldIssue, signUpSchema } from '@/features/auth/auth-schemas';
import { colors, radii, spacing } from '@/theme/tokens';
import { AppText, Button, Inline, TextField } from '@/ui/primitives';
import { AuthFormScreen } from '@/ui/patterns/auth-form-screen';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [issues, setIssues] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    const result = signUpSchema.safeParse({
      acceptedTerms,
      confirmPassword,
      email,
      fullName,
      password,
    });
    if (!result.success) {
      setIssues({
        acceptedTerms: getFieldIssue(result.error, 'acceptedTerms'),
        confirmPassword: getFieldIssue(result.error, 'confirmPassword'),
        email: getFieldIssue(result.error, 'email'),
        fullName: getFieldIssue(result.error, 'fullName'),
        password: getFieldIssue(result.error, 'password'),
      });
      return;
    }

    setIssues({});
    setFormError(undefined);

    setLoading(true);
    try {
      await signUp(result.data.email, result.data.password, result.data.fullName);
      router.replace({ pathname: '/(auth)/verify', params: { email: result.data.email } });
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormScreen
      code="ACCESS // NEW"
      footer={
        <Button
          label="I already have access"
          onPress={() => router.replace('/(auth)/sign-in')}
          variant="ghost"
        />
      }
      subtitle="Create the private identity that will hold your plan and progress."
      title="CREATE PROFILE"
    >
      <TextField
        autoComplete="name"
        error={issues.fullName}
        label="Name"
        onChangeText={setFullName}
        textContentType="name"
        value={fullName}
      />
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        error={issues.email}
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        textContentType="emailAddress"
        value={email}
      />
      <TextField
        autoComplete="new-password"
        error={issues.password}
        hint="10+ characters, uppercase, lowercase, and one number."
        label="Password"
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />
      <TextField
        autoComplete="new-password"
        error={issues.confirmPassword}
        label="Confirm password"
        onChangeText={setConfirmPassword}
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedTerms }}
        onPress={() => setAcceptedTerms((value) => !value)}
      >
        <Inline align="flex-start">
          <View style={[styles.checkbox, acceptedTerms && styles.checkboxSelected]}>
            {acceptedTerms ? <Check color={colors.canvas} size={14} strokeWidth={2.2} /> : null}
          </View>
          <AppText
            color={issues.acceptedTerms ? 'danger' : 'textMuted'}
            style={styles.consent}
            variant="caption"
          >
            I agree to the Terms and Privacy Policy and confirm that I am at least 14 years old.
          </AppText>
        </Inline>
      </Pressable>

      {formError ? (
        <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
          {formError}
        </AppText>
      ) : null}
      <Button label="Secure profile" loading={loading} onPress={submit} />
    </AuthFormScreen>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.hairline,
  },
  checkboxSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  consent: {
    flex: 1,
    paddingTop: spacing.x1,
  },
});
