import {
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  useWindowDimensions,
} from 'react-native';

import { colors, fontFamilies } from '@/theme/tokens';
import { resolveTextLineScale } from './text-scale';

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodySmall' | 'caption';

type AppTextProps = TextProps & {
  color?: keyof typeof colors;
  variant?: TextVariant;
};

const variantLineHeight: Record<TextVariant, number> = {
  body: 24,
  bodySmall: 21,
  caption: 17,
  display: 44,
  heading: 26,
  title: 33,
};

export function AppText({
  allowFontScaling = true,
  color = 'text',
  maxFontSizeMultiplier = 2,
  style,
  variant = 'body',
  ...props
}: AppTextProps) {
  const { fontScale } = useWindowDimensions();
  const lineScale = resolveTextLineScale(fontScale, allowFontScaling, maxFontSizeMultiplier);

  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        styles.base,
        variantStyles[variant],
        { color: colors[color], lineHeight: Math.round(variantLineHeight[variant] * lineScale) },
        style,
      ]}
      {...props}
    />
  );
}

type MonoLabelProps = TextProps & {
  color?: keyof typeof colors;
  size?: 'small' | 'medium';
};

export function MonoLabel({
  allowFontScaling = true,
  color = 'textMuted',
  maxFontSizeMultiplier = 2,
  size = 'small',
  style,
  ...props
}: MonoLabelProps) {
  const { fontScale } = useWindowDimensions();
  const lineScale = resolveTextLineScale(fontScale, allowFontScaling, maxFontSizeMultiplier);

  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        styles.mono,
        size === 'medium' && styles.monoMedium,
        { color: colors[color], lineHeight: Math.round((size === 'medium' ? 17 : 15) * lineScale) },
        style,
      ]}
      {...props}
    />
  );
}

const variantStyles = StyleSheet.create<Record<TextVariant, TextStyle>>({
  display: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: 2.4,
  },
  title: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 26,
    lineHeight: 33,
    letterSpacing: 1.2,
  },
  heading: {
    fontFamily: fontFamilies.bodySemibold,
    fontSize: 19,
    lineHeight: 26,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
  },
  caption: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
  },
});

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
  mono: {
    fontFamily: fontFamilies.mono,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  monoMedium: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 12,
    lineHeight: 17,
  },
});
