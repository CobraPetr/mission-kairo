import { AlertCircle, Inbox } from 'lucide-react-native';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';
import { Button } from './button';
import { Stack } from './layout';
import { AppText, MonoLabel } from './text';

export function ProgressLine({ value }: { value: number }) {
  const bounded = Math.min(Math.max(value, 0), 1);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: Math.round(bounded * 100) }}
      style={styles.progressTrack}
    >
      <View style={[styles.progressFill, { width: `${bounded * 100}%` }]} />
    </View>
  );
}

type StatusTone = 'neutral' | 'active' | 'success' | 'warning';

const statusGlyph: Record<StatusTone, string> = {
  active: '◆',
  neutral: '—',
  success: '✓',
  warning: '!',
};

const statusColor: Record<StatusTone, keyof typeof colors> = {
  active: 'accent',
  neutral: 'textMuted',
  success: 'success',
  warning: 'warning',
};

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return (
    <View accessibilityLabel={`${tone}: ${label}`} style={[styles.badge, badgeTone[tone]]}>
      <MonoLabel color={statusColor[tone]}>{`${statusGlyph[tone]} ${label}`}</MonoLabel>
    </View>
  );
}

export function Skeleton({ style, ...props }: ViewProps) {
  return <View accessibilityElementsHidden style={[styles.skeleton, style]} {...props} />;
}

type StateProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
};

export function EmptyState({ actionLabel, message, onAction, title }: StateProps) {
  return (
    <Stack style={styles.state}>
      <Inbox color={colors.textDim} size={27} strokeWidth={1.5} />
      <AppText variant="heading">{title}</AppText>
      <AppText color="textMuted" style={styles.centered} variant="bodySmall">
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </Stack>
  );
}

export function ErrorState({ actionLabel = 'Try again', message, onAction, title }: StateProps) {
  return (
    <Stack accessibilityRole="alert" style={styles.state}>
      <AlertCircle color={colors.danger} size={27} strokeWidth={1.5} />
      <AppText variant="heading">{title}</AppText>
      <AppText color="textMuted" style={styles.centered} variant="bodySmall">
        {message}
      </AppText>
      {onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </Stack>
  );
}

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.toast}>
      <AppText variant="bodySmall">{message}</AppText>
    </View>
  );
}

const badgeTone = StyleSheet.create({
  neutral: { borderColor: colors.border },
  active: { borderColor: colors.accentMuted, backgroundColor: colors.accentWash },
  success: { borderColor: colors.success },
  warning: { borderColor: colors.warning },
});

const styles = StyleSheet.create({
  progressTrack: {
    height: 3,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.x2,
    paddingVertical: spacing.x1,
    borderWidth: 1,
    borderRadius: radii.hairline,
  },
  skeleton: {
    minHeight: 16,
    borderRadius: radii.hairline,
    backgroundColor: colors.surfaceRaised,
  },
  state: {
    alignItems: 'center',
    paddingVertical: spacing.x12,
    paddingHorizontal: spacing.x6,
  },
  centered: {
    textAlign: 'center',
    maxWidth: 300,
  },
  toast: {
    position: 'absolute',
    left: spacing.x5,
    right: spacing.x5,
    bottom: spacing.x6,
    paddingHorizontal: spacing.x4,
    paddingVertical: spacing.x3,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceRaised,
  },
});
