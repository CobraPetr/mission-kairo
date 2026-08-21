import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors, fontFamilies, radii, spacing } from '@/theme/tokens';
import { AppText, MonoLabel } from './text';

type FieldProps = TextInputProps & {
  error?: string;
  hint?: string;
  label: string;
};

export const TextField = forwardRef<TextInput, FieldProps>(function TextField(
  { error, hint, label, onBlur, onFocus, style, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <MonoLabel color={error ? 'danger' : 'textMuted'}>{label}</MonoLabel>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.textDim}
        selectionColor={colors.accent}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        style={[styles.input, focused && styles.inputFocused, error && styles.inputError, style]}
        {...props}
      />
      {error || hint ? (
        <AppText color={error ? 'danger' : 'textDim'} variant="caption">
          {error ?? hint}
        </AppText>
      ) : null}
    </View>
  );
});

export const TextArea = forwardRef<TextInput, FieldProps>(function TextArea(props, ref) {
  return (
    <TextField
      ref={ref}
      multiline
      numberOfLines={5}
      textAlignVertical="top"
      {...props}
      style={[styles.textArea, props.style]}
    />
  );
});

const styles = StyleSheet.create({
  field: {
    gap: spacing.x2,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.x4,
    paddingVertical: spacing.x3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 22,
    outlineWidth: 0,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  textArea: {
    minHeight: 128,
  },
});
