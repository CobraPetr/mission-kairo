import { calculatePlanXpRange } from '@winter-arc/domain';
import { router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { usePlan } from '@/features/plan/plan-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import {
  AppText,
  Button,
  ErrorState,
  Inline,
  MonoLabel,
  SafeScreen,
  Stack,
  StatusBadge,
} from '@/ui/primitives';
import { MilitaryIdentityCard } from '@/ui/patterns/military-identity-card';
import { ProtocolHeader } from '@/ui/patterns/protocol-header';
import { SectionPanel } from '@/ui/patterns/section-panel';

export default function PlanPreviewScreen() {
  const { status } = useAuth();
  const { draft } = useOnboarding();
  const { activate, generate, hydrated, state } = usePlan();
  const [ceremonyComplete, setCeremonyComplete] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string>();

  const completeCeremony = useCallback(() => setCeremonyComplete(true), []);

  async function secureAndActivate() {
    if (status !== 'authenticated') {
      router.push('/(auth)/sign-up');
      return;
    }

    setActivating(true);
    setActivationError(undefined);
    try {
      await activate();
      router.replace('/');
    } catch (error) {
      setActivationError(getAuthErrorMessage(error));
    } finally {
      setActivating(false);
    }
  }

  useEffect(() => {
    if (hydrated && state.status === 'idle') void generate();
  }, [generate, hydrated, state.status]);

  if (!hydrated) {
    return (
      <SafeScreen>
        <Stack gap="x3" style={styles.loading}>
          <MonoLabel color="accent">OPENING SECURE FABRICATION CHANNEL</MonoLabel>
          <AppText variant="title">PREPARING IDENTITY FILE</AppText>
        </Stack>
      </SafeScreen>
    );
  }

  if (state.status === 'idle' || state.status === 'generating' || !ceremonyComplete) {
    return (
      <SafeScreen>
        <Stack gap="x6" style={styles.loading}>
          <Stack gap="x2">
            <MonoLabel color="accent">PROFILE COMPILER // AUTHORIZED</MonoLabel>
            <AppText variant="title">FORGING YOUR COMMAND IDENTITY</AppText>
            <AppText color="textMuted" variant="bodySmall">
              Your answers are being sealed into a private 90-day protocol.
            </AppText>
          </Stack>

          <MilitaryIdentityCard
            animate
            fullName={draft.identity.fullName}
            onComplete={completeCeremony}
            username={draft.identity.username}
          />
        </Stack>
      </SafeScreen>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeScreen>
        <ErrorState
          actionLabel="Generate again"
          message={state.message}
          onAction={() => {
            setCeremonyComplete(false);
            void generate();
          }}
          title="Protocol generation failed"
        />
      </SafeScreen>
    );
  }

  const plan = state.plan;
  const xp = calculatePlanXpRange(plan);
  const firstDay = plan.days[0];

  return (
    <SafeScreen scroll>
      <ProtocolHeader
        code={`PLAN // ${plan.planId.toUpperCase()}`}
        eyebrow="Route generated"
        subtitle="Identity verified. Your private 90-day protocol is ready to activate."
        title="MISSION READY"
      />
      <Stack gap="x6" style={styles.body}>
        <MilitaryIdentityCard
          fullName={draft.identity.fullName}
          username={draft.identity.username}
        />

        <Inline justify="space-between">
          <StatusBadge label="Validated" tone="success" />
          <MonoLabel>VERSION // 01</MonoLabel>
        </Inline>

        <Inline gap="x3">
          <View style={styles.metric}>
            <MonoLabel>Duration</MonoLabel>
            <AppText variant="title">90</AppText>
            <MonoLabel color="textDim">Days</MonoLabel>
          </View>
          <View style={styles.metric}>
            <MonoLabel>Track</MonoLabel>
            <AppText style={styles.track} variant="heading">
              {plan.baseTrack.replace(/([A-Z])/g, ' $1').toUpperCase()}
            </AppText>
            <MonoLabel color="textDim">Assigned</MonoLabel>
          </View>
        </Inline>

        <SectionPanel label="MISSION ARCHITECTURE" raised>
          <Stack gap="x4">
            <Inline justify="space-between">
              <AppText variant="bodySmall">Shared expert protocol</AppText>
              <MonoLabel color="accent">80%</MonoLabel>
            </Inline>
            <Inline justify="space-between">
              <AppText variant="bodySmall">Goal-based calibration</AppText>
              <MonoLabel color="accent">20%</MonoLabel>
            </Inline>
            <Inline justify="space-between">
              <AppText variant="bodySmall">Available XP</AppText>
              <MonoLabel color="accent">{xp.maximum.toLocaleString()}</MonoLabel>
            </Inline>
          </Stack>
        </SectionPanel>

        <SectionPanel label="DAY 01 // FIRST ORDERS" raised>
          <Stack gap="x2">
            {firstDay?.missions.map((mission) => (
              <View key={mission.scheduledId} style={styles.missionRow}>
                <CheckCircle2 color={colors.accent} size={18} strokeWidth={1.6} />
                <Stack gap="x1" style={styles.missionCopy}>
                  <MonoLabel color="accent">{mission.category}</MonoLabel>
                  <AppText variant="bodySmall">{mission.title}</AppText>
                </Stack>
                <MonoLabel>{mission.durationMinutes} MIN</MonoLabel>
              </View>
            ))}
          </Stack>
        </SectionPanel>

        <AppText color="textMuted" variant="caption">
          The plan adjusts through completion data and weekly reviews. It does not diagnose or treat
          medical or mental-health conditions.
        </AppText>
        {activationError ? (
          <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
            {activationError}
          </AppText>
        ) : null}
        <Button label="Secure and activate" loading={activating} onPress={secureAndActivate} />
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  body: {
    paddingTop: spacing.x6,
  },
  metric: {
    flex: 1,
    minHeight: 126,
    justifyContent: 'space-between',
    padding: spacing.x4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
  track: {
    fontSize: 15,
    lineHeight: 21,
  },
  missionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.x3,
    paddingVertical: spacing.x2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  missionCopy: {
    flex: 1,
  },
});
