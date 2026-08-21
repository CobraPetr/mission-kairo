import { Stack } from 'expo-router';

import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';

export default function AuthLayout() {
  const reduceMotion = useReducedMotionPreference();

  return (
    <Stack screenOptions={{ animation: reduceMotion ? 'none' : 'fade', headerShown: false }} />
  );
}
