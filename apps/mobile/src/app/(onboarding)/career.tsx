import { router } from 'expo-router';
import { useState } from 'react';

import { careerInputSchema, type CareerGoal } from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { ChoiceCard, Stack } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

const options: { description: string; label: string; value: CareerGoal }[] = [
  {
    value: 'education',
    label: 'FINISH EDUCATION STRONG',
    description: 'Improve focus, output, and academic consistency.',
  },
  {
    value: 'strongSalary',
    label: 'SECURE A STRONG ROLE',
    description: 'Become employable and earn a good salary.',
  },
  {
    value: 'entrepreneur',
    label: 'BECOME AN ENTREPRENEUR',
    description: 'Build the habits and skills to start.',
  },
  {
    value: 'businessOwner',
    label: 'GROW AS A BUSINESS OWNER',
    description: 'Operate with structure, leadership, and consistency.',
  },
  {
    value: 'careerChange',
    label: 'CHANGE DIRECTION',
    description: 'Prepare and execute a career transition.',
  },
  {
    value: 'skillBuilding',
    label: 'BUILD A VALUABLE SKILL',
    description: 'Develop one capability with measurable output.',
  },
];

export default function CareerScreen() {
  const { draft, setGoals, setSection } = useOnboarding();
  const [careerGoal, setCareerGoal] = useState<CareerGoal | null>(draft.goals.careerGoal);

  function continueToRelationshipGoal() {
    const result = careerInputSchema.safeParse(careerGoal);
    if (!result.success) return;
    setGoals({ ...draft.goals, careerGoal: result.data });
    setSection('relationshipGoal');
    router.push('/(onboarding)/relationship-goal');
  }

  return (
    <OnboardingStep
      nextDisabled={!careerGoal}
      onBack={() => router.back()}
      onNext={continueToRelationshipGoal}
      prompt="Choose your work or education direction."
      step={10}
    >
      <Stack gap="x2">
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            description={option.description}
            label={option.label}
            onPress={() => setCareerGoal(option.value)}
            selected={careerGoal === option.value}
          />
        ))}
      </Stack>
    </OnboardingStep>
  );
}
