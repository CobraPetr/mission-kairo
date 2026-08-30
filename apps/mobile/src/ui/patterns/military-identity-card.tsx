import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  type TextStyle,
  type ViewStyle,
  View,
} from 'react-native';

import { createServiceNumber } from '@/features/onboarding/service-number';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';
import { colors, fontFamilies, spacing } from '@/theme/tokens';
import { AppText, Inline, MonoLabel, Stack } from '@/ui/primitives';

const titanium = {
  black: '#080B0E',
  base: '#929CA5',
  bright: '#D8DEE3',
  cold: '#B8C2CA',
  dark: '#4B555E',
  graphite: '#151B20',
  edge: '#EDF2F5',
  ink: '#0B1116',
  inkMuted: '#33414B',
  laser: '#68B8F0',
} as const;

const brushedLines = Array.from({ length: 18 }, (_, index) => index);
const matrixCells = Array.from({ length: 48 }, (_, index) => index);
const progressSegments = Array.from({ length: 6 }, (_, index) => index);

const engravedShadow = Platform.select<TextStyle>({
  default: {
    textShadowColor: titanium.edge,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  web: {
    textShadow: `0 1px 0 ${titanium.edge}`,
  } as TextStyle,
});

const cardShadow = Platform.select<ViewStyle>({
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.48,
    shadowRadius: 24,
  },
  web: {
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.52)',
  } as ViewStyle,
});

const laserShadow = Platform.select<ViewStyle>({
  default: {
    shadowColor: titanium.laser,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 7,
  },
  web: {
    boxShadow: `0 0 10px ${titanium.laser}`,
  } as ViewStyle,
});

type MilitaryIdentityCardProps = {
  animate?: boolean;
  fullName: string;
  onComplete?: () => void;
  username: string;
};

function createIdentityMatrix(value: string): boolean[] {
  const normalized = value || 'WINTERARC';

  return matrixCells.map((index) => {
    const code = normalized.charCodeAt(index % normalized.length);
    return (code + index * 17 + index * index * 3) % 7 < 3;
  });
}

function EngravedField({
  label,
  progress,
  value,
}: {
  label: string;
  progress: Animated.Value;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <AppText style={styles.cardLabel} variant="caption">
        {label}
      </AppText>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.engravedValue,
          engravedShadow,
          {
            opacity: progress,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-12, 0],
                }),
              },
            ],
          },
        ]}
      >
        {value}
      </Animated.Text>
    </View>
  );
}

function CardTexture() {
  return (
    <>
      <View style={[styles.metalHighlight, styles.nonInteractive]} />
      <View style={[styles.metalShadow, styles.nonInteractive]} />
      {brushedLines.map((line) => (
        <View
          key={line}
          style={[styles.brushedLine, styles.nonInteractive, { top: 8 + line * 12 }]}
        />
      ))}
      <View style={[styles.notch, styles.notchTopLeft, styles.nonInteractive]} />
      <View style={[styles.notch, styles.notchTopRight, styles.nonInteractive]} />
      <View style={[styles.notch, styles.notchBottomLeft, styles.nonInteractive]} />
      <View style={[styles.notch, styles.notchBottomRight, styles.nonInteractive]} />
    </>
  );
}

function IdentityMatrix({ cells }: { cells: boolean[] }) {
  return (
    <View style={styles.matrix}>
      {cells.map((active, index) => (
        <View
          key={index}
          style={[styles.matrixCell, active ? styles.matrixCellActive : styles.matrixCellInactive]}
        />
      ))}
    </View>
  );
}

export function MilitaryIdentityCard({
  animate = false,
  fullName,
  onComplete,
  username,
}: MilitaryIdentityCardProps) {
  const reduceMotion = useReducedMotionPreference();
  const [phase, setPhase] = useState(animate ? 0 : 6);
  const [status, setStatus] = useState(animate ? 'LOADING TITANIUM STOCK' : 'CLEARANCE ACTIVE');
  const [feed] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [laserPass] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [numberReveal] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [nameReveal] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [usernameReveal] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [sealReveal] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [matrixReveal] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [cardFlip] = useState(() => new Animated.Value(0));
  const [ceremonyProgress] = useState(() => new Animated.Value(animate ? 0 : 1));
  const serviceNumber = createServiceNumber(username);
  const displayName = fullName.trim().toUpperCase() || 'RECRUIT';
  const callsign = username.trim().toLowerCase() || 'recruit';
  const identityMatrix = useMemo(
    () => createIdentityMatrix(`${serviceNumber}${callsign}`),
    [callsign, serviceNumber],
  );

  useEffect(() => {
    if (!animate || reduceMotion) {
      feed.setValue(1);
      laserPass.setValue(1);
      numberReveal.setValue(1);
      nameReveal.setValue(1);
      usernameReveal.setValue(1);
      sealReveal.setValue(1);
      matrixReveal.setValue(1);
      cardFlip.setValue(0);
      ceremonyProgress.setValue(1);

      const completion = setTimeout(
        () => {
          setPhase(6);
          setStatus('CLEARANCE ACTIVE');
          onComplete?.();
        },
        reduceMotion ? 450 : 0,
      );

      return () => clearTimeout(completion);
    }

    const animations = [
      Animated.timing(feed, {
        delay: 120,
        duration: 980,
        easing: Easing.out(Easing.exp),
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(laserPass, {
        delay: 1_160,
        duration: 3_050,
        easing: Easing.inOut(Easing.cubic),
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(numberReveal, {
        delay: 1_420,
        duration: 520,
        easing: Easing.out(Easing.exp),
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(nameReveal, {
        delay: 2_180,
        duration: 580,
        easing: Easing.out(Easing.exp),
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(usernameReveal, {
        delay: 2_920,
        duration: 580,
        easing: Easing.out(Easing.exp),
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(sealReveal, {
        delay: 3_660,
        damping: 12,
        mass: 0.7,
        stiffness: 180,
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(matrixReveal, {
        delay: 4_880,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(cardFlip, {
        delay: 4_520,
        duration: 1_520,
        easing: Easing.inOut(Easing.cubic),
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(ceremonyProgress, {
        delay: 120,
        duration: 5_900,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ];

    animations.forEach((animation) => animation.start());

    const cue = (
      delay: number,
      nextPhase: number,
      nextStatus: string,
      haptic?: Haptics.ImpactFeedbackStyle,
    ) =>
      setTimeout(() => {
        setPhase(nextPhase);
        setStatus(nextStatus);
        if (haptic && Platform.OS !== 'web') void Haptics.impactAsync(haptic);
      }, delay);

    const cues = [
      cue(1_080, 1, 'METAL STOCK LOCKED', Haptics.ImpactFeedbackStyle.Light),
      cue(1_360, 2, 'ENGRAVING SERVICE ID', Haptics.ImpactFeedbackStyle.Light),
      cue(2_120, 3, 'ETCHING AUTHORIZED HOLDER', Haptics.ImpactFeedbackStyle.Rigid),
      cue(2_860, 4, 'BINDING SECURE CALLSIGN', Haptics.ImpactFeedbackStyle.Medium),
      cue(3_600, 5, 'STAMPING COMMAND CLEARANCE', Haptics.ImpactFeedbackStyle.Rigid),
      cue(4_460, 5, 'VERIFYING IDENTITY MATRIX', Haptics.ImpactFeedbackStyle.Medium),
      setTimeout(() => {
        setPhase(6);
        setStatus('CLEARANCE ACTIVE');
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 6_000),
      setTimeout(() => onComplete?.(), 6_520),
    ];

    return () => {
      animations.forEach((animation) => animation.stop());
      cues.forEach(clearTimeout);
    };
  }, [
    animate,
    cardFlip,
    ceremonyProgress,
    feed,
    laserPass,
    matrixReveal,
    nameReveal,
    numberReveal,
    onComplete,
    reduceMotion,
    sealReveal,
    usernameReveal,
  ]);

  const flipRotation = cardFlip.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Stack gap="x3" style={styles.root}>
      {animate ? (
        <Inline justify="space-between">
          <MonoLabel color="accent">COMMAND ID FABRICATION</MonoLabel>
          <MonoLabel>{`${String(phase).padStart(2, '0')} // 06`}</MonoLabel>
        </Inline>
      ) : null}

      <View style={styles.fabricator}>
        {animate ? (
          <View style={styles.slotAssembly}>
            <View style={styles.slotHousing}>
              <View style={styles.slot} />
              <View style={styles.slotSensor} />
            </View>
          </View>
        ) : null}

        <Animated.View
          style={[
            styles.cardMotion,
            {
              opacity: feed,
              transform: [
                { perspective: 1_000 },
                {
                  translateY: feed.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-104, 0],
                  }),
                },
                {
                  rotateX: feed.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['24deg', '0deg'],
                  }),
                },
                {
                  scale: feed.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            accessible
            accessibilityLabel={`Mission Kairo command card for ${displayName}, callsign ${callsign}, service number ${serviceNumber}`}
            style={[
              styles.flipShell,
              cardShadow,
              {
                transform: [{ perspective: 1_000 }, { rotateY: flipRotation }],
              },
            ]}
            testID="identity-card-flip"
          >
            <Animated.View
              style={[
                styles.cardFace,
                styles.cardFront,
                {
                  opacity: cardFlip.interpolate({
                    inputRange: [0, 0.24, 0.27, 0.73, 0.76, 1],
                    outputRange: [1, 1, 0, 0, 1, 1],
                  }),
                },
              ]}
              testID="military-identity-card"
            >
              <CardTexture />

              <Inline justify="space-between" style={styles.cardHeader}>
                <View>
                  <AppText style={styles.commandTitle} variant="caption">
                    MISSION KAIRO // COMMAND AUTHORITY
                  </AppText>
                  <AppText style={styles.commandSubtitle} variant="caption">
                    PERSONAL OPERATIVE IDENTIFICATION
                  </AppText>
                </View>
                <View style={styles.issueMark}>
                  <AppText style={styles.issueText} variant="caption">
                    WA
                  </AppText>
                  <AppText style={styles.issueNumber} variant="caption">
                    /01
                  </AppText>
                </View>
              </Inline>

              <View style={styles.cardBody}>
                <Animated.View
                  style={[
                    styles.insignia,
                    {
                      opacity: sealReveal,
                      transform: [
                        {
                          scale: sealReveal.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1.36, 1],
                          }),
                        },
                        {
                          rotate: sealReveal.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['-12deg', '0deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                  testID="clearance-seal"
                >
                  <View style={styles.sealRailTop} />
                  <View style={[styles.chevron, styles.chevronTop]} />
                  <View style={[styles.chevron, styles.chevronMiddle]} />
                  <View style={styles.insigniaCore} />
                  <AppText style={styles.clearanceCode} variant="caption">
                    C-01
                  </AppText>
                  <AppText style={styles.clearanceText} variant="caption">
                    ACTIVE
                  </AppText>
                </Animated.View>

                <Stack gap="x1" style={styles.identityFields}>
                  <EngravedField
                    label="SERVICE NUMBER"
                    progress={numberReveal}
                    value={serviceNumber}
                  />
                  <EngravedField
                    label="AUTHORIZED HOLDER"
                    progress={nameReveal}
                    value={displayName}
                  />
                  <EngravedField
                    label="SECURE CALLSIGN"
                    progress={usernameReveal}
                    value={`@${callsign}`}
                  />
                </Stack>
              </View>

              <Inline justify="space-between" style={styles.cardFooter}>
                <AppText style={styles.footerText} variant="caption">
                  PERSONAL // NON-TRANSFERABLE
                </AppText>
                <AppText style={styles.footerText} variant="caption">
                  PROTOCOL // 90D
                </AppText>
              </Inline>

              {animate ? (
                <Animated.View
                  style={[
                    styles.engravingRail,
                    styles.nonInteractive,
                    laserShadow,
                    {
                      opacity: laserPass.interpolate({
                        inputRange: [0, 0.03, 0.94, 1],
                        outputRange: [0, 0.96, 0.96, 0],
                      }),
                      transform: [
                        {
                          translateY: laserPass.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 214],
                          }),
                        },
                      ],
                    },
                  ]}
                  testID="engraving-rail"
                >
                  <View style={styles.laserHead} />
                </Animated.View>
              ) : null}
            </Animated.View>

            <Animated.View
              style={[
                styles.cardFace,
                styles.cardBack,
                {
                  opacity: cardFlip.interpolate({
                    inputRange: [0, 0.24, 0.27, 0.73, 0.76, 1],
                    outputRange: [0, 0, 1, 1, 0, 0],
                  }),
                },
              ]}
              testID="military-identity-card-back"
            >
              <CardTexture />
              <Inline justify="space-between" style={styles.backHeader}>
                <View>
                  <AppText style={styles.backTitle} variant="caption">
                    IDENTITY AUTHENTICATION PLATE
                  </AppText>
                  <AppText style={styles.backSubtitle} variant="caption">
                    ENCRYPTED PERSONAL FILE // WA-001
                  </AppText>
                </View>
                <View style={styles.backStatusDot} />
              </Inline>

              <View style={styles.backBody}>
                <Animated.View
                  style={[
                    styles.matrixPanel,
                    {
                      opacity: matrixReveal,
                      transform: [
                        {
                          scale: matrixReveal.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.86, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <IdentityMatrix cells={identityMatrix} />
                  <AppText style={styles.matrixLabel} variant="caption">
                    IDENT MATRIX
                  </AppText>
                </Animated.View>

                <View style={styles.authenticationData}>
                  <View style={styles.dataRow}>
                    <AppText style={styles.dataLabel} variant="caption">
                      CLEARANCE
                    </AppText>
                    <AppText style={styles.dataValue} variant="caption">
                      COMMAND // 01
                    </AppText>
                  </View>
                  <View style={styles.dataRow}>
                    <AppText style={styles.dataLabel} variant="caption">
                      CYCLE
                    </AppText>
                    <AppText style={styles.dataValue} variant="caption">
                      90 DAYS
                    </AppText>
                  </View>
                  <View style={styles.dataRow}>
                    <AppText style={styles.dataLabel} variant="caption">
                      ACCESS
                    </AppText>
                    <AppText style={styles.dataValue} variant="caption">
                      PERSONAL
                    </AppText>
                  </View>
                  <View style={styles.backCodeRail}>
                    <AppText style={styles.backCode} variant="caption">
                      {`${serviceNumber} // ${callsign.toUpperCase()}`}
                    </AppText>
                  </View>
                </View>
              </View>

              <AppText style={styles.authenticationNotice} variant="caption">
                VERIFIED BY MISSION KAIRO COMMAND AUTHORITY
              </AppText>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </View>

      {animate ? (
        <Stack gap="x2" style={styles.statusBlock}>
          <Inline justify="space-between">
            <MonoLabel color="text">{status}</MonoLabel>
            <MonoLabel color={phase === 6 ? 'success' : 'accent'}>
              {phase === 6 ? 'VERIFIED' : 'FABRICATING'}
            </MonoLabel>
          </Inline>
          <View style={styles.segmentTrack}>
            {progressSegments.map((segment) => {
              const start = segment / progressSegments.length;
              const end = Math.min(start + 0.08, 1);

              return (
                <View key={segment} style={styles.segment}>
                  <Animated.View
                    style={[
                      styles.segmentFill,
                      {
                        opacity: ceremonyProgress.interpolate({
                          inputRange: [start, end],
                          outputRange: [0.08, 1],
                          extrapolate: 'clamp',
                        }),
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <MonoLabel style={styles.waitCopy}>
            {phase === 6 ? 'IDENTITY FILE SEALED' : 'KEEP DEVICE STEADY'}
          </MonoLabel>
        </Stack>
      ) : null}
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', maxWidth: 360, alignSelf: 'center' },
  fabricator: { position: 'relative', paddingTop: spacing.x4 },
  slotAssembly: {
    position: 'absolute',
    zIndex: 4,
    top: 0,
    right: spacing.x5,
    left: spacing.x5,
    height: 24,
    paddingHorizontal: spacing.x3,
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  slotHousing: {
    height: 12,
    justifyContent: 'center',
    paddingHorizontal: spacing.x2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: '#04070A',
  },
  slot: {
    height: 3,
    backgroundColor: titanium.black,
    borderTopWidth: 1,
    borderTopColor: '#24313B',
  },
  slotSensor: {
    position: 'absolute',
    top: 3,
    right: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: titanium.laser,
  },
  cardMotion: { width: '100%' },
  flipShell: { position: 'relative', width: '100%', aspectRatio: 1.58 },
  cardFace: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    padding: spacing.x4,
    borderWidth: 1,
    borderColor: titanium.edge,
    borderRadius: 6,
    backfaceVisibility: 'hidden',
  },
  cardFront: { backgroundColor: titanium.base },
  cardBack: {
    backgroundColor: titanium.cold,
    backfaceVisibility: 'visible',
    transform: [{ rotateY: '180deg' }],
  },
  metalHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '48%',
    height: '100%',
    backgroundColor: titanium.bright,
    opacity: 0.28,
  },
  metalShadow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '34%',
    height: '100%',
    backgroundColor: titanium.dark,
    opacity: 0.18,
  },
  brushedLine: {
    position: 'absolute',
    right: 0,
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: titanium.edge,
    opacity: 0.18,
  },
  notch: {
    position: 'absolute',
    zIndex: 8,
    width: 15,
    height: 15,
    backgroundColor: colors.canvas,
    transform: [{ rotate: '45deg' }],
  },
  notchTopLeft: { top: -8, left: -8 },
  notchTopRight: { top: -8, right: -8 },
  notchBottomLeft: { bottom: -8, left: -8 },
  notchBottomRight: { right: -8, bottom: -8 },
  cardHeader: {
    minHeight: 35,
    paddingBottom: spacing.x2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(11, 17, 22, 0.34)',
  },
  commandTitle: {
    color: titanium.ink,
    fontFamily: fontFamilies.monoSemibold,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.2,
  },
  commandSubtitle: {
    color: titanium.inkMuted,
    fontFamily: fontFamilies.mono,
    fontSize: 6,
    lineHeight: 9,
    letterSpacing: 0.9,
  },
  issueMark: {
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 2,
  },
  issueText: {
    color: titanium.ink,
    fontFamily: fontFamilies.monoSemibold,
    fontSize: 16,
    lineHeight: 18,
  },
  issueNumber: {
    color: titanium.inkMuted,
    fontFamily: fontFamilies.mono,
    fontSize: 7,
    lineHeight: 9,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.x3,
    paddingVertical: spacing.x2,
  },
  insignia: {
    position: 'relative',
    width: 70,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(11, 17, 22, 0.4)',
    backgroundColor: 'rgba(11, 17, 22, 0.08)',
  },
  sealRailTop: {
    position: 'absolute',
    top: 7,
    width: 24,
    height: 2,
    backgroundColor: titanium.ink,
    opacity: 0.65,
  },
  chevron: {
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: titanium.ink,
    transform: [{ rotate: '45deg' }],
  },
  chevronTop: { marginBottom: -13 },
  chevronMiddle: { opacity: 0.58 },
  insigniaCore: {
    width: 6,
    height: 6,
    marginTop: -5,
    transform: [{ rotate: '45deg' }],
    backgroundColor: titanium.ink,
  },
  clearanceCode: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    color: titanium.inkMuted,
    fontFamily: fontFamilies.mono,
    fontSize: 5,
    lineHeight: 7,
    letterSpacing: 0.8,
  },
  clearanceText: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    color: titanium.ink,
    fontFamily: fontFamilies.monoSemibold,
    fontSize: 5,
    lineHeight: 7,
    letterSpacing: 0.9,
  },
  identityFields: { flex: 1 },
  field: {
    minHeight: 35,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 17, 22, 0.28)',
  },
  cardLabel: {
    color: titanium.inkMuted,
    fontFamily: fontFamilies.mono,
    fontSize: 6,
    lineHeight: 8,
    letterSpacing: 0.9,
  },
  engravedValue: {
    color: titanium.ink,
    fontFamily: fontFamilies.monoSemibold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.65,
  },
  cardFooter: {
    minHeight: 18,
    paddingTop: spacing.x2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(11, 17, 22, 0.34)',
  },
  footerText: {
    color: titanium.inkMuted,
    fontFamily: fontFamilies.mono,
    fontSize: 5,
    lineHeight: 7,
    letterSpacing: 0.6,
  },
  engravingRail: {
    position: 'absolute',
    zIndex: 12,
    top: 0,
    right: 0,
    left: 0,
    height: 1,
    backgroundColor: titanium.laser,
  },
  laserHead: {
    position: 'absolute',
    top: -2,
    right: 20,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: titanium.edge,
  },
  backHeader: {
    minHeight: 40,
    paddingBottom: spacing.x2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(11, 17, 22, 0.34)',
  },
  backTitle: {
    color: titanium.ink,
    fontFamily: fontFamilies.monoSemibold,
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 1.05,
  },
  backSubtitle: {
    color: titanium.inkMuted,
    fontFamily: fontFamilies.mono,
    fontSize: 5,
    lineHeight: 8,
    letterSpacing: 0.7,
  },
  backStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: titanium.ink },
  backBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.x4,
    paddingVertical: spacing.x3,
  },
  matrixPanel: {
    width: 94,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(11, 17, 22, 0.48)',
    backgroundColor: titanium.graphite,
  },
  matrix: { width: 63, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  matrixCell: { width: 5, height: 5 },
  matrixCellActive: { backgroundColor: titanium.bright },
  matrixCellInactive: { borderWidth: 1, borderColor: '#45535E' },
  matrixLabel: {
    marginTop: spacing.x2,
    color: titanium.cold,
    fontFamily: fontFamilies.mono,
    fontSize: 5,
    lineHeight: 7,
    letterSpacing: 0.8,
  },
  authenticationData: { flex: 1, gap: spacing.x2 },
  dataRow: {
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 17, 22, 0.28)',
  },
  dataLabel: {
    color: titanium.inkMuted,
    fontFamily: fontFamilies.mono,
    fontSize: 5,
    lineHeight: 7,
    letterSpacing: 0.8,
  },
  dataValue: {
    color: titanium.ink,
    fontFamily: fontFamilies.monoSemibold,
    fontSize: 7,
    lineHeight: 10,
    letterSpacing: 0.7,
  },
  backCodeRail: { padding: spacing.x2, backgroundColor: titanium.graphite },
  backCode: {
    color: titanium.cold,
    fontFamily: fontFamilies.monoMedium,
    fontSize: 6,
    lineHeight: 8,
    letterSpacing: 0.7,
  },
  authenticationNotice: {
    color: titanium.inkMuted,
    fontFamily: fontFamilies.mono,
    fontSize: 5,
    lineHeight: 7,
    letterSpacing: 0.75,
  },
  nonInteractive: { pointerEvents: 'none' },
  statusBlock: { paddingTop: spacing.x2 },
  segmentTrack: { height: 3, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, overflow: 'hidden', backgroundColor: colors.border },
  segmentFill: { width: '100%', height: '100%', backgroundColor: colors.accent },
  waitCopy: { textAlign: 'center' },
});
