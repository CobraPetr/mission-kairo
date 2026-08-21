import { router } from 'expo-router';
import { useState } from 'react';

import {
  relationshipGoalInputSchema,
  type RelationshipGoal,
} from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { ChoiceCard, Stack } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

const options: { description: string; label: string; value: RelationshipGoal }[] = [
  {
    value: 'selfFocus',
    label: 'FOCUS ON MYSELF',
    description: 'Build myself first without chasing a relationship.',
  },
  {
    value: 'approach',
    label: 'APPROACH WITH CONFIDENCE',
    description: 'Become able to start honest conversations.',
  },
  { value: 'date', label: 'START DATING', description: 'Meet people and build real connection.' },
  {
    value: 'relationship',
    label: 'BUILD A RELATIONSHIP',
    description: 'Move toward a committed, healthy partnership.',
  },
  {
    value: 'strengthen',
    label: 'STRENGTHEN MY RELATIONSHIP',
    description: 'Show up better for the person already beside me.',
  },
];

export default function RelationshipGoalScreen() {
  const { draft, setGoals, setSection } = useOnboarding();
  const [relationshipGoal, setRelationshipGoal] = useState<RelationshipGoal | null>(
    draft.goals.relationshipGoal,
  );

  function continueToReview() {
    const result = relationshipGoalInputSchema.safeParse(relationshipGoal);
    if (!result.success) return;
    setGoals({ ...draft.goals, relationshipGoal: result.data });
    setSection('review');
    router.push('/(onboarding)/review');
  }

  return (
    <OnboardingStep
      nextDisabled={!relationshipGoal}
      onBack={() => router.back()}
      onNext={continueToReview}
      prompt="What do you want relationally?"
      step={11}
    >
      <Stack gap="x2">
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            description={option.description}
            label={option.label}
            onPress={() => setRelationshipGoal(option.value)}
            selected={relationshipGoal === option.value}
          />
        ))}
      </Stack>
    </OnboardingStep>
  );
}
