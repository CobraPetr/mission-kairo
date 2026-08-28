import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { publicRuntimeConfig } from '@/config/runtime';
import { colors, spacing } from '@/theme/tokens';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  MonoLabel,
  ProgressLine,
  SafeScreen,
  Skeleton,
  Stack,
  StatusBadge,
  TextArea,
  TextField,
  Toast,
} from '@/ui/primitives';
import { ProtocolHeader } from '@/ui/patterns/protocol-header';

export default function UiLabScreen() {
  if (publicRuntimeConfig.appEnvironment !== 'development') {
    return <Redirect href="/(app)/today" />;
  }

  return (
    <SafeScreen scroll>
      <ProtocolHeader
        code="DEV ONLY"
        eyebrow="Component inspection"
        subtitle="A private route for verifying every reusable state."
        title="UI LAB"
      />
      <Stack gap="x8" style={styles.body}>
        <Stack gap="x3">
          <MonoLabel>Buttons</MonoLabel>
          <Button label="Default action" onPress={() => undefined} />
          <Button disabled label="Disabled action" />
          <Button label="Loading action" loading />
          <Button label="Secondary action" onPress={() => undefined} variant="secondary" />
        </Stack>

        <Stack gap="x4">
          <MonoLabel>Inputs</MonoLabel>
          <TextField label="Callsign" placeholder="Enter callsign" />
          <TextField error="This field is required." label="Error state" value="" />
          <TextArea label="Long response" placeholder="Enter complete response" />
        </Stack>

        <Stack gap="x4">
          <MonoLabel>Feedback</MonoLabel>
          <ProgressLine value={0.42} />
          <StatusBadge label="Active" tone="active" />
          <Skeleton style={styles.skeletonWide} />
          <Skeleton style={styles.skeletonShort} />
        </Stack>

        <View style={styles.divider} />
        <EmptyState message="Complete an order to create evidence." title="No records yet" />
        <ErrorState
          message="The local test request did not complete."
          onAction={() => undefined}
          title="Connection interrupted"
        />
        <AppText color="textMuted" variant="bodySmall">
          Text remains scalable because no primitive disables system font scaling or traps copy
          inside a fixed-height container.
        </AppText>
      </Stack>
      <Toast message="Protocol state saved." visible />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.x6,
  },
  skeletonWide: {
    width: '100%',
    height: 18,
  },
  skeletonShort: {
    width: '58%',
    height: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
