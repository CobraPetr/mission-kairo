import { router } from 'expo-router';
import { useState } from 'react';

import { targetBuildInputSchema, type TargetBuild } from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { ChoiceCard, Stack } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

const options: { description: string; label: string; value: TargetBuild }[] = [
  { value: 'lean', label: 'LEAN', description: 'Lower body fat with a clean, balanced frame.' },
  { value: 'athletic', label: 'ATHLETIC', description: 'Fast, capable, and visibly trained.' },
  {
    value: 'muscular',
    label: 'MUSCULAR',
    description: 'Prioritize size, strength, and structure.',
  },
  {
    value: 'defined',
    label: 'DEFINED',
    description: 'Clear definition with visible abdominal development.',
  },
];

export default function TargetBuildScreen() {
  const { draft, setGoals, setSection } = useOnboarding();
  const [targetBuild, setTargetBuild] = useState<TargetBuild | null>(draft.goals.targetBuild);

  function continueToWeight() {
    const result = targetBuildInputSchema.safeParse({ targetBuild });
    if (!result.success) return;
    setGoals({ ...draft.goals, targetBuild: result.data.targetBuild });
    setSection('targetWeight');
    router.push('/(onboarding)/target-weight');
  }

  return (
    <OnboardingStep
      nextDisabled={!targetBuild}
      onBack={() => router.back()}
      onNext={continueToWeight}
      prompt="Select the build you are moving toward."
      step={7}
    >
      <Stack gap="x2">
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            description={option.description}
            label={option.label}
            onPress={() => setTargetBuild(option.value)}
            selected={targetBuild === option.value}
          />
        ))}
      </Stack>
    </OnboardingStep>
  );
}
