import { router } from 'expo-router';
import { ArrowLeft, Check, Pause, Play, SkipForward } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useExecution } from '@/features/execution/execution-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import {
  AppText,
  Button,
  IconButton,
  Inline,
  MonoLabel,
  SafeScreen,
  Stack,
  StatusBadge,
} from '@/ui/primitives';
import { SectionPanel } from '@/ui/patterns/section-panel';

export default function MissionBriefingScreen() {
  const {
    activeMission,
    advanceStep,
    busy,
    error,
    pauseMission,
    resumeMission,
    skipMission,
    state,
  } = useExecution();

  if (!activeMission) {
    return (
      <SafeScreen>
        <Stack gap="x4" style={styles.empty}>
          <MonoLabel>No active order</MonoLabel>
          <AppText variant="title">RETURN TO TODAY</AppText>
          <Button label="Open command center" onPress={() => router.replace('/(app)/today')} />
        </Stack>
      </SafeScreen>
    );
  }

  const step = activeMission.steps[state.currentStepIndex] ?? activeMission.steps[0];
  const lastStep = state.currentStepIndex === activeMission.steps.length - 1;
  const paused = state.missionStatus === 'paused';

  async function handleAdvance() {
    const result = await advanceStep();
    if (result === 'completed') router.replace('/(app)/today');
  }

  return (
    <SafeScreen scroll>
      <Inline justify="space-between" style={styles.header}>
        <IconButton icon={ArrowLeft} label="Return to Today" onPress={() => router.back()} />
        <MonoLabel>Mission file // {activeMission.scheduledId.slice(-16)}</MonoLabel>
      </Inline>

      <Stack gap="x6" style={styles.body}>
        {error ? (
          <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
            {error}
          </AppText>
        ) : null}
        <Stack gap="x3">
          <StatusBadge label={paused ? 'Paused' : 'Active'} tone={paused ? 'warning' : 'active'} />
          <AppText variant="title">{activeMission.title.toUpperCase()}</AppText>
          <AppText color="textMuted" variant="body">
            Complete each order honestly. Stop if pain, dizziness, or unsafe symptoms appear.
          </AppText>
        </Stack>

        <Inline gap="x1">
          {activeMission.steps.map((item, index) => (
            <View
              key={item.id}
              style={[styles.stepLine, index <= state.currentStepIndex && styles.stepLineActive]}
            />
          ))}
        </Inline>

        <SectionPanel label={`ORDER ${String(state.currentStepIndex + 1).padStart(2, '0')}`} raised>
          <View style={styles.activeOrder}>
            <View style={styles.orderIndex}>
              <MonoLabel color="accent" size="medium">
                {String(state.currentStepIndex + 1).padStart(2, '0')}
              </MonoLabel>
            </View>
            <AppText style={styles.orderCopy} variant="body">
              {step?.instruction}
            </AppText>
          </View>
        </SectionPanel>

        <Inline justify="space-between">
          <Stack gap="x1">
            <MonoLabel>Duration</MonoLabel>
            <AppText variant="heading">{activeMission.durationMinutes} MIN</AppText>
          </Stack>
          <Stack gap="x1" style={styles.rightMetric}>
            <MonoLabel>Reward</MonoLabel>
            <AppText variant="heading">+{activeMission.xp} XP</AppText>
          </Stack>
        </Inline>

        {paused ? (
          <Button
            icon={Play}
            label="Resume mission"
            loading={busy}
            onPress={() => void resumeMission()}
          />
        ) : (
          <Button
            icon={Check}
            label={lastStep ? 'Complete mission' : 'Complete step'}
            loading={busy}
            onPress={() => void handleAdvance()}
          />
        )}
        <Inline gap="x3">
          <Button
            disabled={paused || busy}
            icon={Pause}
            label="Pause"
            onPress={() => void pauseMission()}
            style={styles.secondaryAction}
            variant="secondary"
          />
          <Button
            disabled={busy}
            icon={SkipForward}
            label="Skip today"
            onPress={() =>
              void skipMission(activeMission.scheduledId).then(() => router.replace('/(app)/today'))
            }
            style={styles.secondaryAction}
            variant="ghost"
          />
        </Inline>
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center' },
  header: { paddingTop: spacing.x3, paddingBottom: spacing.x4 },
  body: { paddingTop: spacing.x8 },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border },
  stepLineActive: { backgroundColor: colors.accent },
  activeOrder: { minHeight: 150, justifyContent: 'center', gap: spacing.x5 },
  orderIndex: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radii.hairline,
  },
  orderCopy: { maxWidth: 390 },
  rightMetric: { alignItems: 'flex-end' },
  secondaryAction: { flex: 1 },
});
