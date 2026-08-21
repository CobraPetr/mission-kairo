import { router } from 'expo-router';
import { Check, LockKeyhole, Play, RotateCcw } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useExecution } from '@/features/execution/execution-provider';
import { usePlan } from '@/features/plan/plan-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import {
  AppText,
  Button,
  Inline,
  MonoLabel,
  ProgressLine,
  SafeScreen,
  Stack,
  StatusBadge,
} from '@/ui/primitives';
import { ProtocolHeader } from '@/ui/patterns/protocol-header';
import { SectionPanel } from '@/ui/patterns/section-panel';

export default function TodayScreen() {
  const { beginMission, busy, closeDay, error, state: execution } = useExecution();
  const { state: planState } = usePlan();

  if (planState.status !== 'ready') {
    return (
      <SafeScreen>
        <Stack gap="x5" style={styles.emptyPlan}>
          <MonoLabel color="accent">COMMAND CENTER // LOCKED</MonoLabel>
          <AppText variant="title">GENERATE YOUR PROTOCOL FIRST</AppText>
          <AppText color="textMuted" variant="bodySmall">
            Complete the private intake to create the 90-day route.
          </AppText>
          <Button label="Return to intake" onPress={() => router.push('/(onboarding)')} />
        </Stack>
      </SafeScreen>
    );
  }

  const day = planState.plan.days[execution.activeDay - 1] ?? planState.plan.days[0];
  const missions = day?.missions ?? [];
  const completedCount = missions.filter((mission) =>
    execution.completedMissionIds.includes(mission.scheduledId),
  ).length;
  const progress = missions.length ? completedCount / missions.length : 0;
  const currentMission = missions.find(
    (mission) =>
      !execution.completedMissionIds.includes(mission.scheduledId) &&
      !execution.skippedMissionIds.includes(mission.scheduledId),
  );
  const allComplete = completedCount === missions.length && missions.length > 0;
  const allResolved =
    missions.length > 0 &&
    missions.every(
      (mission) =>
        execution.completedMissionIds.includes(mission.scheduledId) ||
        execution.skippedMissionIds.includes(mission.scheduledId),
    );

  async function openMission(missionId: string) {
    const opened = await beginMission(missionId);
    if (opened) router.push('/(app)/mission');
  }

  return (
    <SafeScreen scroll>
      <ProtocolHeader
        code={`DAY ${String(execution.activeDay).padStart(2, '0')}`}
        eyebrow="Command center"
        subtitle={
          allResolved
            ? allComplete
              ? 'Daily orders complete. Recovery is now part of the mission.'
              : 'Daily orders resolved. Seal the record and continue without hiding the skips.'
            : 'Execute the next order. Nothing else matters yet.'
        }
        title="TODAY"
      />

      <Stack gap="x6" style={styles.body}>
        {error ? (
          <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
            {error}
          </AppText>
        ) : null}
        <SectionPanel label="Mission status" raised>
          <Inline align="flex-end" justify="space-between">
            <Stack gap="x1">
              <MonoLabel color="accent">{allComplete ? 'Complete' : 'In progress'}</MonoLabel>
              <AppText variant="title">{Math.round(progress * 100)}%</AppText>
            </Stack>
            <StatusBadge
              label={
                allComplete ? 'Orders complete' : `${completedCount} / ${missions.length} complete`
              }
              tone={allComplete ? 'success' : 'active'}
            />
          </Inline>
          <View style={styles.progressSpacing}>
            <ProgressLine value={progress} />
          </View>
          <AppText color="textMuted" variant="bodySmall">
            {allComplete
              ? `You secured ${execution.xp} total XP. Return tomorrow without negotiating.`
              : 'Complete one order at a time. XP is recorded only after the final step.'}
          </AppText>
        </SectionPanel>

        <Stack gap="x3">
          <Inline justify="space-between">
            <MonoLabel>
              Daily protocol // {String(missions.length).padStart(2, '0')} orders
            </MonoLabel>
            <MonoLabel>{missions.reduce((sum, mission) => sum + mission.xp, 0)} XP</MonoLabel>
          </Inline>
          {missions.map((mission, index) => {
            const completed = execution.completedMissionIds.includes(mission.scheduledId);
            const skipped = execution.skippedMissionIds.includes(mission.scheduledId);
            const ready = mission.scheduledId === currentMission?.scheduledId;
            const active = mission.scheduledId === execution.currentMissionId;
            return (
              <Pressable
                key={mission.scheduledId}
                accessibilityRole="button"
                disabled={!ready && !active}
                onPress={() => void openMission(mission.scheduledId)}
                style={({ pressed }) => [
                  styles.missionRow,
                  (ready || active) && styles.missionRowReady,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[styles.missionIndex, (ready || completed) && styles.missionIndexReady]}
                >
                  {completed ? (
                    <Check color={colors.success} size={15} strokeWidth={1.8} />
                  ) : skipped ? (
                    <RotateCcw color={colors.textDim} size={14} />
                  ) : ready || active ? (
                    <Play color={colors.accent} size={14} fill={colors.accent} />
                  ) : (
                    <LockKeyhole color={colors.textDim} size={13} strokeWidth={1.7} />
                  )}
                </View>
                <Stack gap="x1" style={styles.missionCopy}>
                  <MonoLabel color={ready || active ? 'accent' : completed ? 'success' : 'textDim'}>
                    {`${mission.category} // 0${index + 1}`}
                  </MonoLabel>
                  <AppText
                    color={ready || active || completed ? 'text' : 'textMuted'}
                    variant="bodySmall"
                  >
                    {mission.title}
                  </AppText>
                </Stack>
                <MonoLabel>{mission.durationMinutes} MIN</MonoLabel>
              </Pressable>
            );
          })}
          {currentMission ? (
            <Button
              disabled={busy}
              label={execution.missionStatus === 'paused' ? 'Resume mission' : 'Open next order'}
              onPress={() => void openMission(currentMission.scheduledId)}
            />
          ) : allResolved && execution.activeDay < 90 ? (
            <Button
              label={`Seal day ${String(execution.activeDay).padStart(2, '0')}`}
              loading={busy}
              onPress={() => void closeDay()}
            />
          ) : null}
        </Stack>

        <SectionPanel label="System note">
          <AppText color="textMuted" variant="bodySmall">
            A missed order changes the recovery path; it never erases previous evidence.
          </AppText>
        </SectionPanel>
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  emptyPlan: { flex: 1, justifyContent: 'center' },
  body: { paddingTop: spacing.x6 },
  progressSpacing: { paddingVertical: spacing.x4 },
  missionRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.x3,
    paddingHorizontal: spacing.x3,
    paddingVertical: spacing.x3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  missionRowReady: { borderColor: colors.borderStrong },
  missionIndex: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.hairline,
  },
  missionIndexReady: { borderColor: colors.accentMuted, backgroundColor: colors.accentWash },
  missionCopy: { flex: 1 },
  pressed: { opacity: 0.7 },
});
