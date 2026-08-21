import { router } from 'expo-router';
import { useState } from 'react';

import { physicalInputSchema, type BuildProfile } from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { ChoiceCard, Stack } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

const buildOptions: { description: string; label: string; value: BuildProfile }[] = [
  {
    value: 'starting',
    label: 'STARTING POINT',
    description: 'Higher body-fat range; rebuilding fitness habits.',
  },
  {
    value: 'average',
    label: 'AVERAGE BUILD',
    description: 'Some foundation; limited visible definition.',
  },
  {
    value: 'athletic',
    label: 'ATHLETIC BUILD',
    description: 'Active base with moderate muscle definition.',
  },
  {
    value: 'defined',
    label: 'DEFINED BUILD',
    description: 'Lean, muscular, and visibly developed.',
  },
];

export default function PhysicalScreen() {
  const { draft, setPhysical, setSection } = useOnboarding();
  const [currentBuild, setCurrentBuild] = useState<BuildProfile | null>(
    draft.physical.currentBuild,
  );

  function continueToRelationship() {
    const result = physicalInputSchema.safeParse({ currentBuild });
    if (!result.success) return;
    setPhysical(result.data);
    setSection('relationship');
    router.push('/(onboarding)/relationship');
  }

  return (
    <OnboardingStep
      nextDisabled={!currentBuild}
      onBack={() => router.back()}
      onNext={continueToRelationship}
      prompt="Choose the closest current build."
      step={4}
    >
      <Stack gap="x2">
        {buildOptions.map((option) => (
          <ChoiceCard
            key={option.value}
            description={option.description}
            label={option.label}
            onPress={() => setCurrentBuild(option.value)}
            selected={currentBuild === option.value}
          />
        ))}
      </Stack>
    </OnboardingStep>
  );
}
