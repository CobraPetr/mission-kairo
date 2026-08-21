import { type ComponentProps, useEffect, useState } from 'react';

import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';
import { AppText } from './text';

type TypewriterTextProps = ComponentProps<typeof AppText> & {
  delay?: number;
  onComplete?: () => void;
  speed?: number;
  text: string;
};

export function TypewriterText({
  delay = 0,
  onComplete,
  speed = 36,
  text,
  ...props
}: TypewriterTextProps) {
  const reduceMotion = useReducedMotionPreference();
  const [visibleLength, setVisibleLength] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      const completionTimer = setTimeout(() => onComplete?.(), 0);
      return () => clearTimeout(completionTimer);
    }

    let timer: ReturnType<typeof setInterval> | undefined;
    const delayTimer = setTimeout(() => {
      let index = 0;
      timer = setInterval(() => {
        index += 1;
        setVisibleLength(index);
        if (index >= text.length) {
          if (timer) clearInterval(timer);
          onComplete?.();
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (timer) clearInterval(timer);
    };
  }, [delay, onComplete, reduceMotion, speed, text]);

  const visibleText = reduceMotion ? text : text.slice(0, visibleLength);

  return (
    <AppText accessibilityLabel={text} {...props}>
      {visibleText}
    </AppText>
  );
}
