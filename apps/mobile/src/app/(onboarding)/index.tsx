import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { resolveOnboardingResumeRoute } from '@/features/onboarding/resolve-onboarding-route';
import { colors, fontFamilies, spacing } from '@/theme/tokens';
import { MonoLabel, SafeScreen, Stack } from '@/ui/primitives';

const wait = (duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration));

function formatMissionDate() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

export default function MissionIntroScreen() {
  const reduceMotion = useReducedMotionPreference();
  const { draft, hydrated } = useOnboarding();
  const resumeRoute = resolveOnboardingResumeRoute(draft);
  const date = useMemo(() => `${formatMissionDate()} // 00:01`, []);
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (!hydrated || resumeRoute) return;
    let active = true;

    async function run() {
      if (reduceMotion) {
        setDisplay(`${date}\nMISSION ACCEPTED.`);
        await wait(500);
      } else {
        let current = '';
        await wait(260);
        for (const character of date) {
          if (!active) return;
          current += character;
          setDisplay(current);
          await wait(42);
        }
        await wait(420);
        for (const character of '\nMISSION ACCEPTED.') {
          if (!active) return;
          current += character;
          setDisplay(current);
          await wait(46);
        }
        await wait(850);
        while (current.length > 0) {
          if (!active) return;
          current = current.slice(0, -1);
          setDisplay(current);
          await wait(10);
        }
        await wait(220);
      }

      if (active) router.replace('/(onboarding)/emotional');
    }

    void run();
    return () => {
      active = false;
    };
  }, [date, hydrated, reduceMotion, resumeRoute]);

  if (!hydrated) return null;
  if (resumeRoute) return <Redirect href={resumeRoute} />;

  return (
    <SafeScreen>
      <View style={styles.marker} />
      <Stack style={styles.stage}>
        <MonoLabel color="text" size="medium" style={styles.copy}>
          {display}
          <MonoLabel color="accent" size="medium">
            _
          </MonoLabel>
        </MonoLabel>
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    justifyContent: 'center',
  },
  marker: {
    position: 'absolute',
    top: spacing.x8,
    left: 0,
    width: 34,
    height: 1,
    backgroundColor: colors.accent,
  },
  copy: {
    fontFamily: fontFamilies.mono,
    fontSize: 15,
    lineHeight: 31,
    letterSpacing: 1.2,
  },
});
