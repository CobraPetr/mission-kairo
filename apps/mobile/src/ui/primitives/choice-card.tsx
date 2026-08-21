import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';
import { AppText, MonoLabel } from './text';

type ChoiceCardProps = {
  description?: string;
  label: string;
  multiple?: boolean;
  onPress: () => void;
  selected: boolean;
};

export function ChoiceCard({
  description,
  label,
  multiple = false,
  onPress,
  selected,
}: ChoiceCardProps) {
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      <View style={styles.copy}>
        <MonoLabel color={selected ? 'accent' : 'text'} size="medium">
          {label}
        </MonoLabel>
        {description ? (
          <AppText color="textMuted" variant="caption">
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.marker, selected && styles.markerSelected]}>
        {selected ? <Check color={colors.canvas} size={14} strokeWidth={2.5} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 68,
    paddingHorizontal: spacing.x4,
    paddingVertical: spacing.x3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.x3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentWash,
  },
  pressed: {
    opacity: 0.72,
  },
  copy: {
    flex: 1,
    gap: spacing.x1,
  },
  marker: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.full,
  },
  markerSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
});
