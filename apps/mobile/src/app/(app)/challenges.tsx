import { Clock3, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';
import {
  AppText,
  Button,
  Inline,
  MonoLabel,
  SafeScreen,
  Stack,
  StatusBadge,
} from '@/ui/primitives';
import { ProtocolHeader } from '@/ui/patterns/protocol-header';

const challenges = [
  {
    code: 'C-007',
    title: 'Seven mornings without snooze',
    detail: 'Build the first proof that your word controls your morning.',
    reward: '+420 XP',
  },
  {
    code: 'C-014',
    title: 'Posture protocol',
    detail: 'Two deliberate posture resets every day for fourteen days.',
    reward: '+600 XP',
  },
] as const;

export default function ChallengesScreen() {
  return (
    <SafeScreen scroll>
      <ProtocolHeader
        code="02 AVAILABLE"
        eyebrow="Optional operations"
        subtitle="Take on more only when the daily standard is stable."
        title="CHALLENGES"
      />
      <Stack gap="x4" style={styles.body}>
        <Inline justify="space-between">
          <StatusBadge label="Available" tone="active" />
          <MonoLabel>Active // 00</MonoLabel>
        </Inline>
        {challenges.map((challenge) => (
          <View key={challenge.code} style={styles.card}>
            <Inline justify="space-between">
              <MonoLabel color="accent">{challenge.code}</MonoLabel>
              <Inline gap="x2">
                <Clock3 color={colors.textDim} size={13} />
                <MonoLabel>7–14 days</MonoLabel>
              </Inline>
            </Inline>
            <Stack gap="x2" style={styles.cardCopy}>
              <AppText variant="heading">{challenge.title}</AppText>
              <AppText color="textMuted" variant="bodySmall">
                {challenge.detail}
              </AppText>
            </Stack>
            <Inline justify="space-between">
              <Inline gap="x2">
                <ShieldCheck color={colors.accent} size={15} />
                <MonoLabel color="accent">{challenge.reward}</MonoLabel>
              </Inline>
              <Button disabled label="Join soon" variant="ghost" />
            </Inline>
          </View>
        ))}
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.x6,
  },
  card: {
    padding: spacing.x4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
  cardCopy: {
    paddingVertical: spacing.x5,
  },
});
