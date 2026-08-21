import { router } from 'expo-router';
import { useState } from 'react';

import { mainGoalInputSchema } from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { TextArea } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

export default function MainGoalScreen() {
  const { draft, setGoals, setSection } = useOnboarding();
  const [mainGoal, setMainGoal] = useState(draft.goals.mainGoal);
  const [error, setError] = useState<string>();

  function continueToTargetBuild() {
    const result = mainGoalInputSchema.safeParse(mainGoal);
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }
    setGoals({ ...draft.goals, mainGoal: result.data });
    setSection('targetBuild');
    router.push('/(onboarding)/target-build');
  }

  return (
    <OnboardingStep
      error={error}
      nextDisabled={mainGoal.trim().length < 10}
      onBack={() => router.back()}
      onNext={continueToTargetBuild}
      prompt="What must change by day 90?"
      step={6}
    >
      <TextArea
        autoFocus
        label="PRIMARY WINTER ARC OBJECTIVE"
        maxLength={360}
        onChangeText={(value) => {
          setMainGoal(value);
          setError(undefined);
        }}
        placeholder="Describe the result that would make this season undeniable..."
        value={mainGoal}
      />
    </OnboardingStep>
  );
}
