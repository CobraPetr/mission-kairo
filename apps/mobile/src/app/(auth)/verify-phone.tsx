import { router } from 'expo-router';
import { MessageSquareLock } from 'lucide-react-native';
import { useState } from 'react';

import { publicRuntimeConfig } from '@/config/runtime';
import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import {
  getFieldIssue,
  phoneVerificationCodeSchema,
  phoneVerificationRequestSchema,
} from '@/features/auth/auth-schemas';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { usePlan } from '@/features/plan/plan-provider';
import { colors } from '@/theme/tokens';
import { AppText, Button, TextField } from '@/ui/primitives';
import { AuthFormScreen } from '@/ui/patterns/auth-form-screen';

type VerificationStage = 'phone' | 'code';

export default function VerifyPhoneScreen() {
  const { draft } = useOnboarding();
  const { activate } = usePlan();
  const { requestPhoneVerification, resendPhoneVerification, status, verifyPhoneVerification } =
    useAuth();
  const [stage, setStage] = useState<VerificationStage>('phone');
  const [phone, setPhone] = useState(draft.identity.phone);
  const [token, setToken] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);
  const isLocalDemo =
    publicRuntimeConfig.appEnvironment === 'development' && status === 'unconfigured';

  async function sendCode() {
    const result = phoneVerificationRequestSchema.safeParse({ phone });
    if (!result.success) {
      setFieldError(getFieldIssue(result.error, 'phone'));
      return;
    }

    setPhone(result.data.phone);
    setFieldError(undefined);
    setFormError(undefined);
    setMessage(undefined);

    if (isLocalDemo) {
      setStage('code');
      return;
    }

    if (status !== 'authenticated') {
      setFormError('Confirm your email before requesting the text message.');
      return;
    }

    setLoading(true);
    try {
      await requestPhoneVerification(result.data.phone);
      setStage('code');
    } catch (requestError) {
      setFormError(getAuthErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    const result = phoneVerificationCodeSchema.safeParse({ phone, token });
    if (!result.success) {
      setFieldError(getFieldIssue(result.error, 'token'));
      return;
    }

    setFieldError(undefined);
    setFormError(undefined);

    if (isLocalDemo) {
      router.replace('/(app)/today');
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneVerification(result.data.phone, result.data.token);
      await activate();
      router.replace('/(app)/today');
    } catch (verificationError) {
      setFormError(getAuthErrorMessage(verificationError));
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setFormError(undefined);
    setMessage(undefined);

    if (isLocalDemo) {
      setMessage('Local preview code reset. Use any 6 digits.');
      return;
    }

    setLoading(true);
    try {
      await resendPhoneVerification(phone);
      setMessage('A new 6-digit code was sent.');
    } catch (resendError) {
      setFormError(getAuthErrorMessage(resendError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormScreen
      code="ACCESS // PHONE"
      footer={
        stage === 'code' ? (
          <Button
            label="Use a different number"
            onPress={() => {
              setFieldError(undefined);
              setFormError(undefined);
              setMessage(undefined);
              setStage('phone');
              setToken('');
            }}
            variant="ghost"
          />
        ) : undefined
      }
      subtitle={
        stage === 'phone'
          ? 'Add one private security channel. We will send a single-use code.'
          : `Enter the code sent to ${phone}.`
      }
      title={stage === 'phone' ? 'VERIFY PHONE' : 'ENTER SECURITY CODE'}
    >
      <MessageSquareLock color={colors.accent} size={36} strokeWidth={1.5} />
      {stage === 'phone' ? (
        <>
          <TextField
            autoComplete="tel"
            error={fieldError}
            inputMode="tel"
            keyboardType="phone-pad"
            label="PHONE // PRIVATE"
            onChangeText={setPhone}
            placeholder="+41 79 123 45 67"
            value={phone}
          />
          <Button label="Send security code" loading={loading} onPress={sendCode} />
        </>
      ) : (
        <>
          <TextField
            autoComplete="one-time-code"
            error={fieldError}
            inputMode="numeric"
            keyboardType="number-pad"
            label="6-DIGIT CODE"
            maxLength={6}
            onChangeText={(value) => setToken(value.replace(/\D/g, ''))}
            textContentType="oneTimeCode"
            value={token}
          />
          {isLocalDemo ? (
            <AppText color="textDim" variant="caption">
              Local preview: enter any six digits.
            </AppText>
          ) : null}
          <Button label="Confirm and enter" loading={loading} onPress={confirmCode} />
          <Button label="Resend code" disabled={loading} onPress={resendCode} variant="ghost" />
        </>
      )}
      {message ? (
        <AppText color="success" variant="caption">
          {message}
        </AppText>
      ) : null}
      {formError ? (
        <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
          {formError}
        </AppText>
      ) : null}
    </AuthFormScreen>
  );
}
