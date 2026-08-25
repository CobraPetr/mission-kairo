import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { CanonicalRouteGate } from '@/features/boot/canonical-route-gate';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';
import { AppProviders } from '@/providers/app-providers';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const reduceMotion = useReducedMotionPreference();
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style="light" />
      <CanonicalRouteGate>
        <Stack
          screenOptions={{
            animation: reduceMotion ? 'none' : 'fade',
            contentStyle: { backgroundColor: colors.canvas },
            headerShown: false,
          }}
        />
      </CanonicalRouteGate>
    </AppProviders>
  );
}
