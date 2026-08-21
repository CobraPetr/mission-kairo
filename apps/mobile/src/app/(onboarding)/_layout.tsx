import { Stack } from 'expo-router';

import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';

export default function OnboardingLayout() {
  const reduceMotion = useReducedMotionPreference();

  return (
    <Stack
      screenOptions={{
        animation: reduceMotion ? 'none' : 'slide_from_right',
        headerShown: false,
      }}
    />
  );
}
