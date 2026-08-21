import { router } from 'expo-router';
import { useState } from 'react';

import { activityInputSchema, type GymAccess } from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { ChoiceCard, Stack, TextField } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';

const accessOptions: { description: string; label: string; value: GymAccess }[] = [
  {
    value: 'member',
    label: 'GYM MEMBER',
    description: 'Reliable access to a commercial or school gym.',
  },
  {
    value: 'home',
    label: 'HOME SETUP',
    description: 'Weights, bands, or bodyweight equipment at home.',
  },
  {
    value: 'outdoor',
    label: 'OUTDOOR / CLUB',
    description: 'Sport club, field, track, or calisthenics park.',
  },
  { value: 'none', label: 'NO EQUIPMENT', description: 'The protocol must work from anywhere.' },
];

export default function ActivityScreen() {
  const { draft, setActivity, setSection } = useOnboarding();
  const [gymAccess, setGymAccess] = useState<GymAccess | null>(draft.activity.gymAccess);
  const [sport, setSport] = useState(draft.activity.sport);
  const [hoursPerWeekInput, setHoursPerWeekInput] = useState(draft.activity.hoursPerWeekInput);
  const [error, setError] = useState<string>();

  function continueToPhysical() {
    const result = activityInputSchema.safeParse({ gymAccess, hoursPerWeekInput, sport });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Complete your activity baseline.');
      return;
    }
    setActivity({ ...result.data, hoursPerWeek: Number(result.data.hoursPerWeekInput) });
    setSection('physical');
    router.push('/(onboarding)/physical');
  }

  return (
    <OnboardingStep
      error={error}
      nextDisabled={!gymAccess || !hoursPerWeekInput}
      onBack={() => router.back()}
      onNext={continueToPhysical}
      prompt="What can you train with consistently?"
      step={3}
    >
      <Stack gap="x2">
        {accessOptions.map((option) => (
          <ChoiceCard
            key={option.value}
            description={option.description}
            label={option.label}
            onPress={() => {
              setGymAccess(option.value);
              setError(undefined);
            }}
            selected={gymAccess === option.value}
          />
        ))}
      </Stack>
      <TextField
        label="SPORT // OPTIONAL"
        maxLength={60}
        onChangeText={setSport}
        placeholder="Football, boxing, running..."
        value={sport}
      />
      <TextField
        inputMode="decimal"
        keyboardType="decimal-pad"
        label="TRAINING HOURS // WEEK"
        onChangeText={(value) => setHoursPerWeekInput(value.replace(/[^\d.]/g, ''))}
        placeholder="4"
        value={hoursPerWeekInput}
      />
    </OnboardingStep>
  );
}
