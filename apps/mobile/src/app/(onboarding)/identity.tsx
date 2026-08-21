import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  identityInputSchema,
  normalizeIdentity,
  type IdentityInput,
  type UnitSystem,
} from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { colors, fontFamilies, radii, spacing } from '@/theme/tokens';
import { Inline, MonoLabel, TextField } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

function UnitOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.unitOption, active && styles.unitOptionActive]}
    >
      <MonoLabel color={active ? 'accent' : 'textMuted'} size="medium">
        {label}
      </MonoLabel>
    </Pressable>
  );
}

export default function IdentityScreen() {
  const { draft, hydrated, setIdentity, setSection } = useOnboarding();
  const [form, setForm] = useState<IdentityInput>(() => ({
    ageInput: draft.identity.ageInput,
    fullName: draft.identity.fullName,
    heightMajorInput: draft.identity.heightMajorInput,
    heightMinorInput: draft.identity.heightMinorInput,
    phone: draft.identity.phone,
    unitSystem: draft.identity.unitSystem,
    username: draft.identity.username,
    weightInput: draft.identity.weightInput,
  }));
  const [error, setError] = useState<string>();

  const complete = useMemo(() => identityInputSchema.safeParse(form).success, [form]);

  if (!hydrated) return null;

  function update<Key extends keyof IdentityInput>(key: Key, value: IdentityInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(undefined);
  }

  function chooseUnits(unitSystem: UnitSystem) {
    setForm((current) => ({
      ...current,
      heightMajorInput: '',
      heightMinorInput: '',
      unitSystem,
      weightInput: '',
    }));
    setError(undefined);
  }

  function continueToSituation() {
    const result = identityInputSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Check the information above.');
      return;
    }

    setIdentity(normalizeIdentity(result.data));
    setSection('situation');
    router.push('/(onboarding)/situation');
  }

  return (
    <OnboardingStep
      error={error}
      nextDisabled={!complete}
      onBack={() => router.back()}
      onNext={continueToSituation}
      prompt="Build your private identity file."
      step={1}
    >
      <TextField
        autoCapitalize="words"
        autoComplete="name"
        label="NAME"
        onChangeText={(value) => update('fullName', value)}
        placeholder="What should we call you?"
        value={form.fullName}
      />
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        label="APP USERNAME"
        onChangeText={(value) => update('username', value.toLowerCase().replace(/\s/g, '_'))}
        placeholder="recruit_name"
        value={form.username}
      />
      <TextField
        inputMode="numeric"
        keyboardType="number-pad"
        label="AGE"
        maxLength={3}
        onChangeText={(value) => update('ageInput', value.replace(/\D/g, ''))}
        placeholder="14+"
        value={form.ageInput}
      />

      <View style={styles.unitField}>
        <MonoLabel>MEASUREMENT SYSTEM</MonoLabel>
        <Inline gap="x2">
          <UnitOption
            active={form.unitSystem === 'metric'}
            label="METRIC"
            onPress={() => chooseUnits('metric')}
          />
          <UnitOption
            active={form.unitSystem === 'imperial'}
            label="IMPERIAL"
            onPress={() => chooseUnits('imperial')}
          />
        </Inline>
      </View>

      <Inline align="flex-start" gap="x3">
        <View style={styles.measurementField}>
          <TextField
            inputMode="decimal"
            keyboardType="decimal-pad"
            label={form.unitSystem === 'metric' ? 'HEIGHT // CM' : 'HEIGHT // FT'}
            onChangeText={(value) => update('heightMajorInput', value.replace(/[^\d.]/g, ''))}
            placeholder={form.unitSystem === 'metric' ? '180' : '5'}
            style={styles.numericInput}
            value={form.heightMajorInput}
          />
        </View>
        {form.unitSystem === 'imperial' ? (
          <View style={styles.measurementField}>
            <TextField
              inputMode="numeric"
              keyboardType="number-pad"
              label="HEIGHT // IN"
              maxLength={2}
              onChangeText={(value) => update('heightMinorInput', value.replace(/\D/g, ''))}
              placeholder="11"
              style={styles.numericInput}
              value={form.heightMinorInput}
            />
          </View>
        ) : null}
        <View style={styles.measurementField}>
          <TextField
            inputMode="decimal"
            keyboardType="decimal-pad"
            label={form.unitSystem === 'metric' ? 'WEIGHT // KG' : 'WEIGHT // LB'}
            onChangeText={(value) => update('weightInput', value.replace(/[^\d.]/g, ''))}
            placeholder={form.unitSystem === 'metric' ? '78' : '172'}
            style={styles.numericInput}
            value={form.weightInput}
          />
        </View>
      </Inline>

      <TextField
        autoComplete="tel"
        hint="Required for the one-time security code. Never shown publicly."
        inputMode="tel"
        keyboardType="phone-pad"
        label="PHONE // VERIFICATION"
        onChangeText={(value) => update('phone', value)}
        placeholder="+41 00 000 00 00"
        value={form.phone}
      />
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  unitField: {
    gap: spacing.x2,
  },
  unitOption: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  unitOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentWash,
  },
  measurementField: {
    flex: 1,
    minWidth: 0,
  },
  numericInput: {
    fontFamily: fontFamilies.mono,
  },
});
