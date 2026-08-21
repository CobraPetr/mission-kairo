import * as Haptics from 'expo-haptics';
import { type LucideIcon } from 'lucide-react-native';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from 'react-native';

import { colors, fontFamilies, layout, radii, spacing } from '@/theme/tokens';
import { AppText } from './text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = Omit<PressableProps, 'children'> & {
  icon?: LucideIcon;
  label: string;
  loading?: boolean;
  variant?: ButtonVariant;
};

export function Button({
  disabled,
  icon: Icon,
  label,
  loading = false,
  onPress,
  style,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(event) => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.(event);
      }}
      style={(state) => [
        styles.base,
        variantStyles[variant],
        state.pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.canvas : colors.accent} />
      ) : (
        <View style={styles.labelRow}>
          {Icon ? (
            <Icon color={variant === 'primary' ? colors.canvas : colors.accent} size={17} />
          ) : null}
          <AppText
            style={[styles.label, { color: variant === 'primary' ? colors.canvas : colors.text }]}
          >
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

type IconButtonProps = Omit<PressableProps, 'children'> & {
  icon: LucideIcon;
  label: string;
};

export function IconButton({ icon: Icon, label, onPress, style, ...props }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={(event) => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.(event);
      }}
      style={(state) => [
        styles.iconButton,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Icon color={colors.textMuted} size={20} strokeWidth={1.7} />
    </Pressable>
  );
}

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
  },
  ghost: {
    backgroundColor: colors.transparent,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.transparent,
    borderColor: colors.danger,
  },
});

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.x5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.control,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.x2,
  },
  label: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.15,
    textTransform: 'uppercase',
  },
  iconButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.42,
  },
});
