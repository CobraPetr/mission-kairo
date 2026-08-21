import { Check, LockKeyhole } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useExecution } from '@/features/execution/execution-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import { AppText, Inline, MonoLabel, SafeScreen, Stack, StatusBadge } from '@/ui/primitives';
import { ProtocolHeader } from '@/ui/patterns/protocol-header';
import { SectionPanel } from '@/ui/patterns/section-panel';

const nodes = [
  { day: 1, label: 'Assessment' },
  { day: 7, label: 'Foundation check' },
  { day: 21, label: 'Discipline gate' },
  { day: 45, label: 'Midpoint review' },
  { day: 70, label: 'Pressure phase' },
  { day: 90, label: 'Protocol complete' },
] as const;

export default function RoadmapScreen() {
  const { state: execution } = useExecution();
  const currentNodeIndex = nodes.reduce(
    (result, node, index) => (node.day <= execution.activeDay ? index : result),
    0,
  );
  return (
    <SafeScreen scroll>
      <ProtocolHeader
        code="SECTOR 01"
        eyebrow="Route intelligence"
        subtitle="The path reveals itself through execution."
        title="ROADMAP"
      />
      <Stack gap="x6" style={styles.body}>
        <Inline justify="space-between">
          <StatusBadge label="90-day route" tone="active" />
          <MonoLabel>{`Day ${String(execution.activeDay).padStart(2, '0')} // 90`}</MonoLabel>
        </Inline>

        <SectionPanel label="Sector map" raised>
          <View style={styles.route}>
            <View style={styles.routeLine} />
            {nodes.map((node, index) => {
              const isCurrent = index === currentNodeIndex;
              const isComplete = index < currentNodeIndex;
              const alignRight = index % 2 === 1;
              return (
                <View
                  key={node.day}
                  style={[styles.nodeRow, alignRight ? styles.nodeRight : styles.nodeLeft]}
                >
                  <View style={[styles.node, (isCurrent || isComplete) && styles.nodeCurrent]}>
                    {isCurrent || isComplete ? (
                      <Check color={isComplete ? colors.success : colors.accent} size={17} />
                    ) : (
                      <LockKeyhole color={colors.textDim} size={14} />
                    )}
                  </View>
                  <Stack gap="x1" style={alignRight && styles.copyRight}>
                    <MonoLabel color={isCurrent ? 'accent' : isComplete ? 'success' : 'textDim'}>
                      Day {node.day}
                    </MonoLabel>
                    <AppText
                      color={isCurrent || isComplete ? 'text' : 'textMuted'}
                      variant="bodySmall"
                    >
                      {node.label}
                    </AppText>
                  </Stack>
                </View>
              );
            })}
          </View>
        </SectionPanel>
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.x6,
  },
  route: {
    position: 'relative',
    paddingVertical: spacing.x2,
  },
  routeLine: {
    position: 'absolute',
    top: 28,
    bottom: 28,
    left: '50%',
    width: 1,
    backgroundColor: colors.borderStrong,
  },
  nodeRow: {
    width: '52%',
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.x3,
  },
  nodeLeft: {
    alignSelf: 'flex-start',
    flexDirection: 'row-reverse',
    paddingRight: spacing.x1,
  },
  nodeRight: {
    alignSelf: 'flex-end',
    paddingLeft: spacing.x1,
  },
  node: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    backgroundColor: colors.canvas,
  },
  nodeCurrent: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
  },
  copyRight: {
    alignItems: 'flex-end',
  },
});
