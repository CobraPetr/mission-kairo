import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';

import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';
import { colors, spacing } from '@/theme/tokens';
import { Inline, MonoLabel, Stack } from '@/ui/primitives';

const networkNodes = [
  { cx: 74, cy: 77 },
  { cx: 126, cy: 63 },
  { cx: 148, cy: 109 },
  { cx: 111, cy: 143 },
  { cx: 67, cy: 126 },
];

export function MissionDial() {
  const reduceMotion = useReducedMotionPreference();
  const [rotation] = useState(() => new Animated.Value(0));
  const [counterRotation] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    rotation.setValue(0);
    counterRotation.setValue(0);
    pulse.setValue(0);
    if (reduceMotion) return;

    const globeAnimation = Animated.loop(
      Animated.timing(rotation, {
        duration: 15_000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    const orbitAnimation = Animated.loop(
      Animated.timing(counterRotation, {
        duration: 8_000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1_450,
          easing: Easing.out(Easing.quad),
          toValue: 1,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          duration: 1_450,
          easing: Easing.in(Easing.quad),
          toValue: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );

    globeAnimation.start();
    orbitAnimation.start();
    pulseAnimation.start();
    return () => {
      globeAnimation.stop();
      orbitAnimation.stop();
      pulseAnimation.stop();
    };
  }, [counterRotation, pulse, reduceMotion, rotation]);

  const globeRotation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const orbitRotation = counterRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View
      accessible
      accessibilityLabel="Mission Kairo command interface: awaiting Winter Arc initialization"
      style={styles.root}
    >
      <Inline justify="space-between" style={styles.header}>
        <MonoLabel>GLOBAL COMMAND</MonoLabel>
        <MonoLabel color="accent">SYSTEM // ONLINE</MonoLabel>
      </Inline>

      <View style={styles.stage}>
        <View style={[styles.corner, styles.cornerTopLeft]} />
        <View style={[styles.corner, styles.cornerTopRight]} />
        <View style={[styles.corner, styles.cornerBottomLeft]} />
        <View style={[styles.corner, styles.cornerBottomRight]} />

        <Animated.View
          testID="globe-pulse"
          style={[
            styles.pulseRing,
            {
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.12, 0.48],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1.06],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          testID="globe-orbit"
          style={[styles.orbitLayer, { transform: [{ rotate: orbitRotation }] }]}
        >
          <Svg height="236" viewBox="0 0 236 236" width="236">
            <Ellipse
              cx="118"
              cy="118"
              fill="none"
              rx="105"
              ry="54"
              stroke={colors.borderStrong}
              strokeDasharray="3 12"
              strokeWidth="1"
              transform="rotate(-22 118 118)"
            />
            <Circle cx="27" cy="89" fill={colors.accent} r="3" />
            <Circle cx="204" cy="148" fill={colors.text} opacity="0.72" r="2" />
          </Svg>
        </Animated.View>

        <Animated.View
          testID="globe-grid"
          style={[styles.globeLayer, { transform: [{ rotate: globeRotation }] }]}
        >
          <Svg height="194" viewBox="0 0 220 220" width="194">
            <Circle
              cx="110"
              cy="110"
              fill={colors.surface}
              r="76"
              stroke={colors.accent}
              strokeWidth="1.6"
            />

            <G fill="none" opacity="0.68" stroke={colors.accent} strokeWidth="0.85">
              <Ellipse cx="110" cy="110" rx="30" ry="76" />
              <Ellipse cx="110" cy="110" rx="56" ry="76" />
              <Ellipse cx="110" cy="110" rx="76" ry="25" />
              <Ellipse cx="110" cy="110" rx="76" ry="51" />
              <Line x1="34" x2="186" y1="110" y2="110" />
              <Line x1="110" x2="110" y1="34" y2="186" />
            </G>

            <G fill="none" opacity="0.48" stroke={colors.textMuted} strokeWidth="0.75">
              <Path d="M74 77 L126 63 L148 109 L111 143 L67 126 Z" />
              <Path d="M74 77 L111 143 M126 63 L67 126 M148 109 L74 77" />
            </G>

            {networkNodes.map((node, index) => (
              <Circle
                key={`${node.cx}-${node.cy}`}
                cx={node.cx}
                cy={node.cy}
                fill={index === 2 ? colors.text : colors.accent}
                opacity={index === 2 ? 0.9 : 0.72}
                r={index === 2 ? 2.8 : 2.1}
              />
            ))}

            <Circle cx="110" cy="110" fill={colors.accent} opacity="0.16" r="10" />
            <Circle cx="110" cy="110" fill={colors.accent} r="3" />
          </Svg>
        </Animated.View>

        <View style={styles.axisHorizontal} />
        <View style={styles.axisVertical} />
      </View>

      <Stack gap="x2" style={styles.statusBlock}>
        <Inline justify="space-between">
          <MonoLabel color="textMuted">NETWORK // LOCKED</MonoLabel>
          <MonoLabel color="textMuted">SIGNAL // STABLE</MonoLabel>
        </Inline>
        <View style={styles.statusTrack}>
          <View style={styles.statusSignal} />
        </View>
      </Stack>
    </View>
  );
}

const cornerLength = 22;

const styles = StyleSheet.create({
  root: {
    width: '100%',
    maxWidth: 330,
    alignSelf: 'center',
  },
  header: {
    paddingBottom: spacing.x2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stage: {
    position: 'relative',
    height: 264,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  globeLayer: {
    position: 'absolute',
    width: 194,
    height: 194,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitLayer: {
    position: 'absolute',
    width: 236,
    height: 236,
  },
  pulseRing: {
    position: 'absolute',
    width: 214,
    height: 214,
    borderRadius: 107,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  axisHorizontal: {
    position: 'absolute',
    width: 248,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.68,
  },
  axisVertical: {
    position: 'absolute',
    width: 1,
    height: 224,
    backgroundColor: colors.border,
    opacity: 0.68,
  },
  corner: {
    position: 'absolute',
    width: cornerLength,
    height: cornerLength,
    borderColor: colors.textMuted,
    opacity: 0.84,
  },
  cornerTopLeft: {
    top: spacing.x3,
    left: 0,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  cornerTopRight: {
    top: spacing.x3,
    right: 0,
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  cornerBottomLeft: {
    bottom: spacing.x3,
    left: 0,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
  },
  cornerBottomRight: {
    right: 0,
    bottom: spacing.x3,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  statusBlock: {
    paddingTop: spacing.x2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusTrack: {
    height: 2,
    backgroundColor: colors.border,
  },
  statusSignal: {
    width: '34%',
    height: 2,
    backgroundColor: colors.accent,
  },
});
