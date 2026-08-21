import { type PropsWithChildren, useEffect, useState } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';

type CinematicRevealProps = PropsWithChildren<{
  delay?: number;
  distance?: number;
  duration?: number;
  scaleFrom?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function CinematicReveal({
  children,
  delay = 0,
  distance = 10,
  duration = 520,
  scaleFrom = 1,
  style,
}: CinematicRevealProps) {
  const reduceMotion = useReducedMotionPreference();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }

    const animation = Animated.timing(progress, {
      delay,
      duration,
      easing: Easing.out(Easing.exp),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [delay, duration, progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [scaleFrom, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
