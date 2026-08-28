import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { PropsWithChildren } from 'react';

import { spacing } from '@/theme/tokens';
import { IconButton, Inline, MonoLabel, SafeScreen, Stack } from '@/ui/primitives';
import { ProtocolHeader } from './protocol-header';

type LegalDocumentScreenProps = PropsWithChildren<{
  code: string;
  subtitle: string;
  title: string;
}>;

export function LegalDocumentScreen({ children, code, subtitle, title }: LegalDocumentScreenProps) {
  return (
    <SafeScreen scroll>
      <Inline justify="space-between" style={{ paddingTop: spacing.x3 }}>
        <IconButton icon={ArrowLeft} label="Go back" onPress={() => router.back()} />
        <MonoLabel>VERSION // 28 AUG 2026</MonoLabel>
      </Inline>
      <ProtocolHeader code={code} eyebrow="Public information" subtitle={subtitle} title={title} />
      <Stack gap="x6" style={{ paddingTop: spacing.x6, paddingBottom: spacing.x10 }}>
        {children}
      </Stack>
    </SafeScreen>
  );
}
