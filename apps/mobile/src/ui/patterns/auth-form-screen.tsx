import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '@/theme/tokens';
import { AppText, IconButton, Inline, MonoLabel, SafeScreen, Stack } from '@/ui/primitives';

type AuthFormScreenProps = PropsWithChildren<{
  code: string;
  footer?: ReactNode;
  subtitle: string;
  title: string;
}>;

export function AuthFormScreen({ children, code, footer, subtitle, title }: AuthFormScreenProps) {
  function returnToPreviousScreen() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(auth)/welcome');
  }

  return (
    <SafeScreen scroll>
      <Inline justify="space-between" style={styles.header}>
        <IconButton icon={ArrowLeft} label="Go back" onPress={returnToPreviousScreen} />
        <MonoLabel>{code}</MonoLabel>
      </Inline>
      <Stack gap="x3" style={styles.intro}>
        <MonoLabel color="accent">Identity channel</MonoLabel>
        <AppText variant="title">{title}</AppText>
        <AppText color="textMuted" variant="bodySmall">
          {subtitle}
        </AppText>
      </Stack>
      <Stack gap="x5" style={styles.form}>
        {children}
      </Stack>
      {footer ? <Stack style={styles.footer}>{footer}</Stack> : null}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.x3,
  },
  intro: {
    paddingTop: spacing.x10,
  },
  form: {
    paddingTop: spacing.x8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.x8,
  },
});
