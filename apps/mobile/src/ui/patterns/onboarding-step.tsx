import { ArrowLeft } from 'lucide-react-native';
import { type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import {
  AppText,
  Button,
  IconButton,
  Inline,
  MonoLabel,
  ProgressLine,
  SafeScreen,
  Stack,
} from '@/ui/primitives';

type OnboardingStepProps = PropsWithChildren<{
  error?: string;
  nextDisabled?: boolean;
  nextLabel?: string;
  onBack: () => void;
  onNext: () => void;
  prompt: string;
  step: number;
  totalSteps?: number;
}>;

export function OnboardingStep({
  children,
  error,
  nextDisabled,
  nextLabel = 'Continue',
  onBack,
  onNext,
  prompt,
  step,
  totalSteps = 12,
}: OnboardingStepProps) {
  return (
    <SafeScreen scroll scrollProps={{ automaticallyAdjustKeyboardInsets: true }}>
      <Stack gap="x6" style={styles.page}>
        <Inline justify="space-between">
          <MonoLabel>PERSONAL INTAKE // PRIVATE</MonoLabel>
          <MonoLabel>
            {String(step).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
          </MonoLabel>
        </Inline>
        <ProgressLine value={step / totalSteps} />
        <Stack gap="x3" style={styles.briefing}>
          <MonoLabel color="accent">MISSION CALIBRATION</MonoLabel>
          <AppText style={styles.prompt} variant="title">
            {prompt}
          </AppText>
          <AppText color="textMuted" variant="bodySmall">
            Your answers shape your protocol and remain inside your private account workspace.
          </AppText>
        </Stack>

        <View style={styles.fields}>{children}</View>

        {error ? (
          <AppText accessibilityRole="alert" color="danger" variant="caption">
            {error}
          </AppText>
        ) : null}

        <Inline gap="x3" style={styles.actions}>
          <IconButton icon={ArrowLeft} label="Back" onPress={onBack} />
          <Button disabled={nextDisabled} label={nextLabel} onPress={onNext} style={styles.next} />
        </Inline>
        <MonoLabel style={styles.footer}>LOCAL SAVE // PRIVATE DEVICE CACHE</MonoLabel>
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    minHeight: 760,
    paddingTop: spacing.x4,
    paddingBottom: spacing.x4,
  },
  briefing: {
    paddingTop: spacing.x2,
  },
  prompt: {
    maxWidth: 460,
    fontSize: 25,
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  fields: {
    gap: spacing.x5,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.x6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  next: {
    flex: 1,
  },
  footer: {
    textAlign: 'center',
  },
});
