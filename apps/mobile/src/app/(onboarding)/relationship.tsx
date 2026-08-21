import { router } from 'expo-router';
import { useState } from 'react';

import {
  relationshipInputSchema,
  type RelationshipStatus,
} from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { ChoiceCard, Stack } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

const options: { description: string; label: string; value: RelationshipStatus }[] = [
  { value: 'single', label: 'SINGLE', description: 'Not currently pursuing or seeing someone.' },
  {
    value: 'interested',
    label: 'INTERESTED IN SOMEONE',
    description: 'There is someone you want the confidence to approach.',
  },
  { value: 'dating', label: 'DATING', description: 'Getting to know someone or dating casually.' },
  {
    value: 'committed',
    label: 'IN A RELATIONSHIP',
    description: 'Currently in a committed relationship.',
  },
  { value: 'married', label: 'MARRIED', description: 'Married or in a long-term partnership.' },
];

export default function RelationshipScreen() {
  const { draft, setRelationship, setSection } = useOnboarding();
  const [status, setStatus] = useState<RelationshipStatus | null>(draft.relationship.status);

  function continueToGoals() {
    const result = relationshipInputSchema.safeParse({ status });
    if (!result.success) return;
    setRelationship(result.data);
    setSection('mainGoal');
    router.push('/(onboarding)/main-goal');
  }

  return (
    <OnboardingStep
      nextDisabled={!status}
      onBack={() => router.back()}
      onNext={continueToGoals}
      prompt="What is your relationship situation?"
      step={5}
    >
      <Stack gap="x2">
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            description={option.description}
            label={option.label}
            onPress={() => setStatus(option.value)}
            selected={status === option.value}
          />
        ))}
      </Stack>
    </OnboardingStep>
  );
}
