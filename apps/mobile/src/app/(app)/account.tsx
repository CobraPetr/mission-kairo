import { router } from 'expo-router';
import { ArrowLeft, CreditCard, LogOut, RotateCcw, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import { useExecution } from '@/features/execution/execution-provider';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { usePlan } from '@/features/plan/plan-provider';
import { openPublicDocument } from '@/features/legal/public-documents';
import { useSubscription } from '@/features/subscription/subscription-provider';
import { spacing } from '@/theme/tokens';
import { AppText, Button, IconButton, Inline, MonoLabel, SafeScreen, Stack } from '@/ui/primitives';

export default function AccountScreen() {
  const { deleteAccount, signOut, status, user } = useAuth();
  const { reset: resetExecution } = useExecution();
  const { resetDraft } = useOnboarding();
  const { reset: resetPlan } = usePlan();
  const {
    access: subscriptionAccess,
    busy: subscriptionBusy,
    error: subscriptionError,
    manage,
    restore,
  } = useSubscription();
  const [error, setError] = useState<string>();
  const [loadingAction, setLoadingAction] = useState<'delete' | 'signout'>();

  async function clearLocalAccountData() {
    await Promise.all([resetExecution(), resetPlan(), resetDraft()]);
  }

  async function executeSignOut() {
    setError(undefined);
    setLoadingAction('signout');
    try {
      await clearLocalAccountData();
      await signOut();
      router.replace('/(auth)/welcome');
    } catch (reason) {
      setError(getAuthErrorMessage(reason));
    } finally {
      setLoadingAction(undefined);
    }
  }

  function confirmDeletion() {
    Alert.alert(
      'Delete Mission — Kairo account?',
      'This permanently deletes your profile and progress. This cannot be undone.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete permanently',
          onPress: () => {
            setError(undefined);
            setLoadingAction('delete');
            void clearLocalAccountData()
              .then(deleteAccount)
              .then(() => {
                router.replace('/(auth)/welcome');
              })
              .catch((reason: unknown) => setError(getAuthErrorMessage(reason)))
              .finally(() => setLoadingAction(undefined));
          },
        },
      ],
    );
  }

  return (
    <SafeScreen>
      <Inline justify="space-between" style={styles.header}>
        <IconButton icon={ArrowLeft} label="Return to profile" onPress={() => router.back()} />
        <MonoLabel>Account control</MonoLabel>
      </Inline>
      <Stack gap="x8" style={styles.body}>
        <Stack gap="x2">
          <AppText variant="title">ACCOUNT</AppText>
          <AppText color="textMuted" variant="bodySmall">
            {user?.email ??
              (status === 'unconfigured' ? 'Backend not connected' : 'No active account')}
          </AppText>
        </Stack>
        {error ? (
          <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
            {error}
          </AppText>
        ) : null}
        <Stack gap="x3">
          <MonoLabel>SUBSCRIPTION</MonoLabel>
          <AppText color="textMuted" variant="bodySmall">
            {subscriptionAccess === 'active'
              ? 'Mission Kairo Pro is active.'
              : subscriptionAccess === 'notEnforced'
                ? 'Store access is disabled in this development build.'
                : 'No active Mission Kairo Pro entitlement was found.'}
          </AppText>
          {subscriptionError ? (
            <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
              {subscriptionError}
            </AppText>
          ) : null}
          <Button
            disabled={subscriptionAccess !== 'active' || subscriptionBusy}
            icon={CreditCard}
            label="Manage subscription"
            onPress={() => void manage().catch(() => undefined)}
            variant="secondary"
          />
          <Button
            disabled={subscriptionAccess === 'notEnforced' || subscriptionBusy}
            icon={RotateCcw}
            label="Restore purchases"
            loading={subscriptionBusy}
            onPress={() => void restore().catch(() => undefined)}
            variant="secondary"
          />
        </Stack>
        <Stack gap="x3">
          <MonoLabel>LEGAL & SUPPORT</MonoLabel>
          <Button
            label="Privacy policy"
            onPress={() => void openPublicDocument('privacy')}
            variant="ghost"
          />
          <Button
            label="Terms of use"
            onPress={() => void openPublicDocument('terms')}
            variant="ghost"
          />
          <Button
            label="Support"
            onPress={() => void openPublicDocument('support')}
            variant="ghost"
          />
        </Stack>
        <Stack gap="x3">
          <Button
            disabled={status !== 'authenticated'}
            icon={LogOut}
            label="Sign out"
            loading={loadingAction === 'signout'}
            onPress={executeSignOut}
            variant="secondary"
          />
          <Button
            disabled={status !== 'authenticated'}
            icon={Trash2}
            label="Delete account"
            loading={loadingAction === 'delete'}
            onPress={confirmDeletion}
            variant="danger"
          />
        </Stack>
        <AppText color="textDim" variant="caption">
          Deletion removes the authentication record and cascades through private profile data.
          Store subscription cancellation remains controlled by Apple or Google.
        </AppText>
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.x3,
  },
  body: {
    paddingTop: spacing.x10,
  },
});
