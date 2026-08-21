import { StyleSheet, View } from 'react-native';

import { useExecution } from '@/features/execution/execution-provider';
import {
  calculateActiveWeekProgress,
  calculateSealedDayStreak,
  getActiveWeekStartIndex,
} from '@/features/execution/progress-metrics';
import { usePlan } from '@/features/plan/plan-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import { AppText, Inline, MonoLabel, SafeScreen, Stack, StatusBadge } from '@/ui/primitives';
import { ProtocolHeader } from '@/ui/patterns/protocol-header';
import { SectionPanel } from '@/ui/patterns/section-panel';

export default function ProgressScreen() {
  const { state: execution } = useExecution();
  const { state: planState } = usePlan();
  const week =
    planState.status === 'ready'
      ? calculateActiveWeekProgress(
          planState.plan.days,
          execution.activeDay,
          execution.completedMissionIds,
        )
      : Array.from({ length: 7 }, () => 0);
  const completedDays = week.filter((value) => value === 1).length;
  const currentWeekStart = getActiveWeekStartIndex(execution.activeDay) + 1;
  const sealedThisWeek = execution.sealedDayNumbers.filter(
    (day) => day >= currentWeekStart && day < currentWeekStart + 7,
  ).length;
  const currentStreak = calculateSealedDayStreak(execution.sealedDayNumbers);
  return (
    <SafeScreen scroll>
      <ProtocolHeader
        code={`WEEK ${String(Math.ceil(execution.activeDay / 7)).padStart(2, '0')}`}
        eyebrow="Performance record"
        subtitle="Evidence over mood. Every completed order stays visible."
        title="PROGRESS"
      />
      <Stack gap="x6" style={styles.body}>
        <Inline justify="space-between">
          <StatusBadge label="Baseline" tone="active" />
          <MonoLabel>Saved // local</MonoLabel>
        </Inline>

        <SectionPanel label="Weekly consistency" raised>
          <View accessibilityLabel="Weekly consistency chart" style={styles.chart}>
            {week.map((value, index) => (
              <Stack key={index} gap="x2" style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${value * 100}%` }]} />
                </View>
                <MonoLabel>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</MonoLabel>
              </Stack>
            ))}
          </View>
        </SectionPanel>

        <Inline gap="x3">
          <View style={styles.metric}>
            <MonoLabel>Sealed week</MonoLabel>
            <AppText variant="title">{String(sealedThisWeek).padStart(2, '0')}</AppText>
            <MonoLabel color="textDim">Days</MonoLabel>
          </View>
          <View style={styles.metric}>
            <MonoLabel>Total XP</MonoLabel>
            <AppText variant="title">{execution.xp.toLocaleString()}</AppText>
            <MonoLabel color="textDim">Points</MonoLabel>
          </View>
        </Inline>

        <Inline justify="space-between">
          <MonoLabel>Current streak</MonoLabel>
          <MonoLabel color="accent">{currentStreak} sealed days</MonoLabel>
        </Inline>

        <SectionPanel label="Weekly evidence">
          <AppText color="textMuted" variant="bodySmall">
            {completedDays >= 7
              ? 'Weekly review unlocked. Private photos and measurements will be added in the next build phase.'
              : `Complete ${7 - completedDays} more full ${7 - completedDays === 1 ? 'day' : 'days'} to unlock the first weekly review.`}
          </AppText>
        </SectionPanel>
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.x6,
  },
  chart: {
    height: 168,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.x2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 132,
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceRaised,
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.accentMuted,
  },
  metric: {
    flex: 1,
    gap: spacing.x2,
    padding: spacing.x4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
});
