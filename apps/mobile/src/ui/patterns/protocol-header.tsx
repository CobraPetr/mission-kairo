import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { AppText, Inline, MonoLabel, Stack } from '@/ui/primitives';

type ProtocolHeaderProps = {
  code: string;
  eyebrow: string;
  subtitle?: string;
  title: string;
};

export function ProtocolHeader({ code, eyebrow, subtitle, title }: ProtocolHeaderProps) {
  return (
    <Stack gap="x4" style={styles.root}>
      <Inline justify="space-between">
        <MonoLabel>{eyebrow}</MonoLabel>
        <Inline gap="x2">
          <View style={styles.dot} />
          <MonoLabel color="accent">{code}</MonoLabel>
        </Inline>
      </Inline>
      <Stack gap="x2">
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText color="textMuted" variant="bodySmall">
            {subtitle}
          </AppText>
        ) : null}
      </Stack>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: spacing.x4,
    paddingBottom: spacing.x6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
});
