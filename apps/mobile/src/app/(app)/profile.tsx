import { router } from 'expo-router';
import { Settings2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useExecution } from '@/features/execution/execution-provider';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import {
  AppText,
  IconButton,
  Inline,
  MonoLabel,
  SafeScreen,
  Stack,
  StatusBadge,
} from '@/ui/primitives';
import { ProtocolHeader } from '@/ui/patterns/protocol-header';
import { SectionPanel } from '@/ui/patterns/section-panel';

export default function ProfileScreen() {
  const { draft } = useOnboarding();
  const { state: execution } = useExecution();
  const initials =
    draft.identity.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'MK';
  return (
    <SafeScreen scroll>
      <ProtocolHeader
        code={`RECRUIT ${String(execution.activeDay).padStart(3, '0')}`}
        eyebrow="Personal file"
        subtitle="Private by default. Public only by deliberate choice."
        title="PROFILE"
      />
      <Stack gap="x6" style={styles.body}>
        <View style={styles.identity}>
          <Inline justify="space-between">
            <View style={styles.avatar}>
              <MonoLabel color="accent" size="medium">
                {initials}
              </MonoLabel>
            </View>
            <IconButton
              icon={Settings2}
              label="Profile settings"
              onPress={() => router.push('/(app)/account')}
            />
          </Inline>
          <Stack gap="x2" style={styles.identityCopy}>
            <AppText variant="heading">{draft.identity.fullName || 'UNASSIGNED RECRUIT'}</AppText>
            <MonoLabel>
              {draft.identity.username
                ? `@${draft.identity.username} // ${execution.xp} XP`
                : 'Protocol not yet activated'}
            </MonoLabel>
          </Stack>
          <StatusBadge label="Private file" tone="active" />
        </View>

        <SectionPanel label="PROTOCOL IDENTITY">
          <Stack gap="x3">
            <Inline justify="space-between">
              <AppText color="textMuted" variant="bodySmall">
                Age
              </AppText>
              <MonoLabel>{draft.identity.age ?? '—'}</MonoLabel>
            </Inline>
            <Inline justify="space-between">
              <AppText color="textMuted" variant="bodySmall">
                Units
              </AppText>
              <MonoLabel>{draft.identity.unitSystem}</MonoLabel>
            </Inline>
            <Inline justify="space-between">
              <AppText color="textMuted" variant="bodySmall">
                Current build
              </AppText>
              <MonoLabel>{draft.physical.currentBuild ?? '—'}</MonoLabel>
            </Inline>
          </Stack>
        </SectionPanel>

        <SectionPanel label="PRIMARY OBJECTIVE">
          <AppText color={draft.goals.mainGoal ? 'text' : 'textMuted'} variant="bodySmall">
            {draft.goals.mainGoal || 'No objective recorded.'}
          </AppText>
        </SectionPanel>
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.x6,
  },
  identity: {
    padding: spacing.x4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radii.hairline,
  },
  identityCopy: {
    paddingVertical: spacing.x5,
  },
});
