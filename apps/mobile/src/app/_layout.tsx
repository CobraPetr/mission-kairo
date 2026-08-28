import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { publicRuntimeConfig } from '@/config/runtime';
import { CanonicalRouteGate } from '@/features/boot/canonical-route-gate';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';
import { AppProviders } from '@/providers/app-providers';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();
Observe.configure({
  dispatchInDebug: false,
  dispatchingEnabled: publicRuntimeConfig.appEnvironment === 'production',
  environment: publicRuntimeConfig.appEnvironment,
  integrations: { 'expo-router': false },
  sampleRate: 1,
});

function RootLayout() {
  const reduceMotion = useReducedMotionPreference();
  const { markInteractive } = useObserve();
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
      markInteractive();
    }
  }, [fontError, fontsLoaded, markInteractive]);

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

function RootErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <View style={styles.errorPage}>
      <Text style={styles.errorCode}>SYSTEM // RECOVERY</Text>
      <Text style={styles.errorTitle}>MISSION STATE INTERRUPTED</Text>
      <Text style={styles.errorBody}>
        No private answers were included in this error report. Restart this screen to restore the
        last verified state.
      </Text>
      <Pressable accessibilityRole="button" onPress={resetError} style={styles.errorButton}>
        <Text style={styles.errorButtonText}>RESTART SCREEN</Text>
      </Pressable>
    </View>
  );
}

export default function ObservedRootLayout() {
  return (
    <ObserveRoot errorBoundaryFallback={RootErrorFallback}>
      <RootLayout />
    </ObserveRoot>
  );
}

const styles = StyleSheet.create({
  errorPage: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    padding: 28,
    backgroundColor: colors.canvas,
  },
  errorCode: { color: colors.accent, fontSize: 11, letterSpacing: 1.6 },
  errorTitle: { color: colors.text, fontSize: 24, fontWeight: '600', letterSpacing: 1.1 },
  errorBody: { color: colors.textMuted, fontSize: 15, lineHeight: 23 },
  errorButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  errorButtonText: { color: colors.text, fontSize: 12, letterSpacing: 1.4 },
});
