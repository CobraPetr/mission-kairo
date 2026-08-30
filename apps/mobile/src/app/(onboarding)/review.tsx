import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import { AppText, Inline, MonoLabel, Stack } from '@/ui/primitives';
import { OnboardingStep } from '@/ui/patterns/onboarding-step';
import { SectionPanel } from '@/ui/patterns/section-panel';

const labels: Record<string, string> = {
  athletic: 'Athletic',
  average: 'Average build',
  businessOwner: 'Business owner',
  careerChange: 'Change direction',
  committed: 'In a relationship',
  conversation: 'Conversation',
  dating: 'Dating confidence',
  defined: 'Defined',
  discipline: 'Self-discipline',
  education: 'Finish education strong',
  employed: 'Employed',
  entrepreneur: 'Become an entrepreneur',
  interested: 'Interested in someone',
  lean: 'Lean',
  married: 'Married',
  muscular: 'Muscular',
  selfEmployed: 'Self-employed',
  single: 'Single',
  skillBuilding: 'Build a valuable skill',
  socialConfidence: 'Social confidence',
  starting: 'Starting point',
  strongSalary: 'Secure a strong role',
  student: 'Student',
};

function CheckRow({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress}>
      <Inline align="flex-start">
        <View style={[styles.checkbox, checked && styles.checkboxSelected]}>
          {checked ? <Check color={colors.canvas} size={14} strokeWidth={2.2} /> : null}
        </View>
        <AppText color="textMuted" style={styles.consent} variant="caption">
          {label}
        </AppText>
      </Inline>
    </Pressable>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Inline align="flex-start" justify="space-between" style={styles.summaryRow}>
      <MonoLabel>{label}</MonoLabel>
      <AppText style={styles.summaryValue} variant="bodySmall">
        {value}
      </AppText>
    </Inline>
  );
}

export default function ReviewScreen() {
  const { draft, setConsent, setSection } = useOnboarding();
  const isMinor = (draft.identity.age ?? 18) < 18;
  const canContinue = draft.consent.generalConfirmed && !isMinor;
  const displayWeight = `${draft.identity.weightInput} ${draft.identity.unitSystem === 'metric' ? 'kg' : 'lb'}`;
  const targetWeight = `${draft.goals.targetWeightInput} ${draft.identity.unitSystem === 'metric' ? 'kg' : 'lb'}`;

  return (
    <OnboardingStep
      nextDisabled={!canContinue}
      nextLabel="Create secure profile"
      onBack={() => router.back()}
      onNext={() => {
        setConsent({ ...draft.consent, confirmedAt: new Date().toISOString() });
        setSection('planPreview');
        router.push('/(onboarding)/plan-preview');
      }}
      prompt="Confirm the mission parameters."
      step={12}
    >
      <SectionPanel label="IDENTITY // PRIVATE" raised>
        <Stack gap="x3">
          <SummaryRow label="NAME" value={draft.identity.fullName} />
          <SummaryRow label="CALLSIGN" value={`@${draft.identity.username}`} />
          <SummaryRow label="AGE" value={String(draft.identity.age ?? '—')} />
          <SummaryRow label="CURRENT" value={displayWeight} />
        </Stack>
      </SectionPanel>

      <SectionPanel label="BASELINE" raised>
        <Stack gap="x3">
          <SummaryRow
            label="WORK"
            value={labels[draft.situation.workStatus ?? ''] ?? draft.situation.workStatus ?? '—'}
          />
          <SummaryRow
            label="BUILD"
            value={labels[draft.physical.currentBuild ?? ''] ?? draft.physical.currentBuild ?? '—'}
          />
          <SummaryRow
            label="STATUS"
            value={labels[draft.relationship.status ?? ''] ?? draft.relationship.status ?? '—'}
          />
        </Stack>
      </SectionPanel>

      <SectionPanel label="90-DAY OBJECTIVE" raised>
        <Stack gap="x3">
          <AppText variant="bodySmall">{draft.goals.mainGoal}</AppText>
          <SummaryRow
            label="TARGET BUILD"
            value={labels[draft.goals.targetBuild ?? ''] ?? draft.goals.targetBuild ?? '—'}
          />
          <SummaryRow label="TARGET WEIGHT" value={targetWeight} />
          <SummaryRow
            label="MENTAL FOCUS"
            value={draft.goals.confidenceGoals.map((value) => labels[value] ?? value).join(' + ')}
          />
        </Stack>
      </SectionPanel>

      <CheckRow
        checked={draft.consent.generalConfirmed}
        label="These answers are accurate. I understand Mission — Kairo provides general fitness and self-development guidance, not medical or mental-health treatment."
        onPress={() =>
          setConsent({
            ...draft.consent,
            confirmedAt: null,
            generalConfirmed: !draft.consent.generalConfirmed,
          })
        }
      />
      {isMinor ? (
        <SectionPanel label="18+ BETA" raised>
          <AppText color="textMuted" variant="bodySmall">
            Mission — Kairo is available to adults only during the public beta. This profile cannot
            activate yet.
          </AppText>
        </SectionPanel>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    gap: spacing.x4,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.hairline,
  },
  checkboxSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  consent: {
    flex: 1,
    paddingTop: spacing.x1,
  },
});
