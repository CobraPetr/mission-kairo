import { router } from 'expo-router';
import { useState } from 'react';

import { situationInputSchema, type WorkStatus } from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { ChoiceCard, Stack, TextField } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

const options: { description: string; label: string; value: WorkStatus }[] = [
  {
    value: 'student',
    label: 'STUDENT',
    description: 'School, university, or professional training.',
  },
  { value: 'employed', label: 'EMPLOYED', description: 'Part-time, full-time, or permanent role.' },
  {
    value: 'selfEmployed',
    label: 'SELF-EMPLOYED',
    description: 'Freelance, creator, or independent work.',
  },
  {
    value: 'businessOwner',
    label: 'BUSINESS OWNER',
    description: 'Operating or building a company.',
  },
  {
    value: 'betweenRoles',
    label: 'BETWEEN ROLES',
    description: 'Looking for the next position or direction.',
  },
  { value: 'other', label: 'OTHER', description: 'A different path or current situation.' },
];

export default function SituationScreen() {
  const { draft, setSection, setSituation } = useOnboarding();
  const [workStatus, setWorkStatus] = useState<WorkStatus | null>(draft.situation.workStatus);
  const [workDetail, setWorkDetail] = useState(draft.situation.workDetail);
  const [error, setError] = useState<string>();

  function continueToActivity() {
    const result = situationInputSchema.safeParse({ workDetail, workStatus });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Choose your current situation.');
      return;
    }
    setSituation(result.data);
    setSection('activity');
    router.push('/(onboarding)/activity');
  }

  return (
    <OnboardingStep
      error={error}
      nextDisabled={!workStatus}
      onBack={() => router.back()}
      onNext={continueToActivity}
      prompt="Where are you operating from right now?"
      step={2}
    >
      <Stack gap="x2">
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            description={option.description}
            label={option.label}
            onPress={() => {
              setWorkStatus(option.value);
              setError(undefined);
            }}
            selected={workStatus === option.value}
          />
        ))}
      </Stack>
      <TextField
        label="CURRENT ROLE // OPTIONAL"
        maxLength={80}
        onChangeText={setWorkDetail}
        placeholder="Computer science student, warehouse operator..."
        value={workDetail}
      />
    </OnboardingStep>
  );
}
