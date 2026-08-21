import { type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';
import { Inline, MonoLabel } from '@/ui/primitives';

type SectionPanelProps = PropsWithChildren<{
  action?: ReactNode;
  label?: string;
  raised?: boolean;
}>;

export function SectionPanel({ action, children, label, raised = false }: SectionPanelProps) {
  return (
    <View style={[styles.panel, raised && styles.raised]}>
      {label || action ? (
        <Inline justify="space-between" style={styles.header}>
          {label ? <MonoLabel>{label}</MonoLabel> : <View />}
          {action}
        </Inline>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingVertical: spacing.x5,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  raised: {
    paddingHorizontal: spacing.x4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
  header: {
    marginBottom: spacing.x4,
  },
});
