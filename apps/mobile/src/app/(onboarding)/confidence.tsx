import { router } from 'expo-router';
import { useState } from 'react';

import {
  confidenceInputSchema,
  type ConfidenceGoal,
} from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { ChoiceCard, MonoLabel, Stack } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

const options: { description: string; label: string; value: ConfidenceGoal }[] = [
  {
    value: 'socialConfidence',
    label: 'SOCIAL CONFIDENCE',
    description: 'Stop shrinking in rooms and group situations.',
  },
  {
    value: 'conversation',
    label: 'CONVERSATION',
    description: 'Speak clearly, listen well, and hold attention.',
  },
  {
    value: 'dating',
    label: 'DATING CONFIDENCE',
    description: 'Approach and connect without hiding behind fear.',
  },
  {
    value: 'discipline',
    label: 'SELF-DISCIPLINE',
    description: 'Keep promises when motivation disappears.',
  },
  {
    value: 'calm',
    label: 'CALM UNDER PRESSURE',
    description: 'Respond with control instead of reacting.',
  },
];

export default function ConfidenceScreen() {
  const { draft, setGoals, setSection } = useOnboarding();
  const [selected, setSelected] = useState<ConfidenceGoal[]>(draft.goals.confidenceGoals);

  function toggle(value: ConfidenceGoal) {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length < 2
          ? [...current, value]
          : current,
    );
  }

  function continueToCareer() {
    const result = confidenceInputSchema.safeParse(selected);
    if (!result.success) return;
    setGoals({ ...draft.goals, confidenceGoals: result.data });
    setSection('career');
    router.push('/(onboarding)/career');
  }

  return (
    <OnboardingStep
      nextDisabled={selected.length === 0}
      onBack={() => router.back()}
      onNext={continueToCareer}
      prompt="Choose two mental targets at most."
      step={9}
    >
      <MonoLabel>{selected.length} / 2 SELECTED</MonoLabel>
      <Stack gap="x2">
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            description={option.description}
            label={option.label}
            multiple
            onPress={() => toggle(option.value)}
            selected={selected.includes(option.value)}
          />
        ))}
      </Stack>
    </OnboardingStep>
  );
}
