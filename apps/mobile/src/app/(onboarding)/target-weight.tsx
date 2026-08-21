import { router } from 'expo-router';
import { useState } from 'react';

import {
  normalizeTargetWeight,
  targetWeightInputSchema,
} from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { TextField } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

export default function TargetWeightScreen() {
  const { draft, setGoals, setSection } = useOnboarding();
  const [targetWeightInput, setTargetWeightInput] = useState(draft.goals.targetWeightInput);
  const [error, setError] = useState<string>();
  const unit = draft.identity.unitSystem === 'metric' ? 'KG' : 'LB';

  function continueToConfidence() {
    const input = { targetWeightInput, unitSystem: draft.identity.unitSystem };
    const result = targetWeightInputSchema.safeParse(input);
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }
    setGoals({
      ...draft.goals,
      targetWeightInput: result.data.targetWeightInput,
      targetWeightKg: normalizeTargetWeight(result.data),
    });
    setSection('confidence');
    router.push('/(onboarding)/confidence');
  }

  return (
    <OnboardingStep
      error={error}
      nextDisabled={!targetWeightInput}
      onBack={() => router.back()}
      onNext={continueToConfidence}
      prompt="Set a realistic 90-day weight target."
      step={8}
    >
      <TextField
        autoFocus
        hint={`Current: ${draft.identity.weightInput || '—'} ${unit}. You can revise this later.`}
        inputMode="decimal"
        keyboardType="decimal-pad"
        label={`TARGET WEIGHT // ${unit}`}
        onChangeText={(value) => {
          setTargetWeightInput(value.replace(/[^\d.]/g, ''));
          setError(undefined);
        }}
        placeholder={draft.identity.weightInput || (unit === 'KG' ? '75' : '165')}
        value={targetWeightInput}
      />
    </OnboardingStep>
  );
}
