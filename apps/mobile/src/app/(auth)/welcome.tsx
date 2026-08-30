import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useExecution } from '@/features/execution/execution-provider';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { resolveOnboardingResumeRoute } from '@/features/onboarding/resolve-onboarding-route';
import { usePlan } from '@/features/plan/plan-provider';
import { colors, spacing } from '@/theme/tokens';
import {
  Button,
  CinematicReveal,
  Inline,
  MonoLabel,
  SafeScreen,
  Stack,
  TypewriterText,
} from '@/ui/primitives';
import { MissionDial } from '@/ui/patterns/mission-dial';

function formatMissionDate() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

export default function WelcomeScreen() {
  const date = useMemo(() => formatMissionDate(), []);
  const { reset: resetExecution } = useExecution();
  const { draft, resetDraft } = useOnboarding();
  const { reset: resetPlan } = usePlan();
  const [startingMission, setStartingMission] = useState(false);

  async function acceptMission() {
    setStartingMission(true);
    try {
      if (!resolveOnboardingResumeRoute(draft)) {
        await Promise.all([resetDraft(), resetPlan(), resetExecution()]);
      }
      router.push('/(onboarding)');
    } finally {
      setStartingMission(false);
    }
  }

  return (
    <SafeScreen scroll>
      <Stack style={styles.page}>
        <CinematicReveal delay={60} distance={-7} duration={420}>
          <Inline justify="space-between">
            <MonoLabel>MISSION KAIRO // PRIVATE</MonoLabel>
            <MonoLabel>{date}</MonoLabel>
          </Inline>
        </CinematicReveal>

        <CinematicReveal delay={180} duration={500}>
          <Stack gap="x3" style={styles.titleBlock}>
            <MonoLabel>ACTIVE PROTOCOL // WA-001</MonoLabel>
            <TypewriterText
              delay={300}
              speed={58}
              style={styles.title}
              text="WINTER ARC_"
              variant="display"
            />
            <MonoLabel>MISSION KAIRO // 90-DAY SELF-COMMAND</MonoLabel>
          </Stack>
        </CinematicReveal>

        <CinematicReveal delay={760} distance={14} duration={680} scaleFrom={0.94}>
          <MissionDial />
        </CinematicReveal>

        <CinematicReveal delay={1040} distance={8} duration={460}>
          <MonoLabel color="text" size="medium" style={styles.directive}>
            DECIDE ONCE. EXECUTE DAILY.
          </MonoLabel>
        </CinematicReveal>

        <CinematicReveal delay={1200} distance={12} duration={520} style={styles.command}>
          <Stack gap="x2">
            <MonoLabel color="accent" style={styles.actionLabel}>
              COMMAND INPUT // REQUIRED
            </MonoLabel>
            <Button label="Accept mission" loading={startingMission} onPress={acceptMission} />
            <Button
              disabled={startingMission}
              label="Restore access"
              onPress={() => router.push('/(auth)/sign-in')}
              variant="secondary"
            />
            <MonoLabel style={styles.footer}>PRIVATE SESSION // ACCOUNT REQUIRED</MonoLabel>
          </Stack>
        </CinematicReveal>
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 760,
    paddingTop: spacing.x4,
    paddingBottom: spacing.x4,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: spacing.x10,
  },
  title: {
    color: colors.text,
    fontSize: 43,
    lineHeight: 51,
    letterSpacing: -1.8,
    textAlign: 'center',
  },
  directive: {
    marginTop: -spacing.x1,
    width: '100%',
    textAlign: 'center',
  },
  command: {
    marginTop: 'auto',
    paddingTop: spacing.x3,
  },
  actionLabel: {
    marginBottom: spacing.x1,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.x1,
  },
});
