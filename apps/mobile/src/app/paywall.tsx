import type { PurchasesPackage } from 'react-native-purchases';
import { router } from 'expo-router';
import { Check, ShieldCheck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSubscription } from '@/features/subscription/subscription-provider';
import { openPublicDocument } from '@/features/legal/public-documents';
import { colors, radii, spacing } from '@/theme/tokens';
import { AppText, Button, Inline, MonoLabel, SafeScreen, Stack } from '@/ui/primitives';
import { ProtocolHeader } from '@/ui/patterns/protocol-header';

const benefits = [
  'Your complete 90-day Winter Arc protocol',
  'Daily mission execution, XP, and streak recovery',
  'Private progress and roadmap history across devices',
];

function packageLabel(candidate: PurchasesPackage): string {
  if (candidate.packageType === 'ANNUAL') return 'Annual protocol';
  if (candidate.packageType === 'MONTHLY') return 'Monthly protocol';
  return candidate.product.title;
}

function packageCadence(candidate: PurchasesPackage): string {
  if (candidate.packageType === 'ANNUAL') return 'per year';
  if (candidate.packageType === 'MONTHLY') return 'per month';
  return candidate.product.subscriptionPeriod ?? '';
}

export default function PaywallScreen() {
  const { access, busy, error, packages, purchase, refresh, restore } = useSubscription();
  const preferredPackage = useMemo(
    () => packages.find((candidate) => candidate.packageType === 'ANNUAL') ?? packages[0],
    [packages],
  );
  const [selected, setSelected] = useState<PurchasesPackage>();
  const activePackage = selected ?? preferredPackage;

  useEffect(() => {
    if (access === 'active' || access === 'notEnforced') router.replace('/');
  }, [access]);

  async function startProtocol() {
    if (!activePackage) return;
    const active = await purchase(activePackage).catch(() => false);
    if (active) router.replace('/');
  }

  async function restoreAccess() {
    const active = await restore().catch(() => false);
    if (active) router.replace('/');
  }

  return (
    <SafeScreen scroll>
      <ProtocolHeader
        code="ACCESS // PROTOCOL 001"
        eyebrow="Final authorization"
        subtitle="Your route is ready. Activate full command access to begin Day 01."
        title="COMMIT TO 90 DAYS"
      />
      <Stack gap="x6" style={styles.body}>
        <View style={styles.trialPanel}>
          <MonoLabel color="accent">INTRODUCTORY WINDOW</MonoLabel>
          <AppText variant="title">3 DAYS</AppText>
          <AppText color="textMuted" variant="bodySmall">
            Eligible new subscribers can test the complete protocol before the first charge. The
            store confirmation shows the exact trial and renewal terms before purchase.
          </AppText>
        </View>

        <Stack gap="x3">
          {benefits.map((benefit) => (
            <Inline key={benefit} align="flex-start" gap="x3">
              <Check color={colors.accent} size={18} strokeWidth={1.8} />
              <AppText style={styles.benefit} variant="bodySmall">
                {benefit}
              </AppText>
            </Inline>
          ))}
        </Stack>

        {packages.length ? (
          <Stack gap="x3">
            {packages.map((candidate) => {
              const isSelected = candidate.identifier === activePackage?.identifier;
              return (
                <Pressable
                  key={candidate.identifier}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => setSelected(candidate)}
                  style={({ pressed }) => [
                    styles.package,
                    isSelected && styles.packageSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Stack gap="x1" style={styles.packageCopy}>
                    <Inline gap="x2">
                      <MonoLabel color={isSelected ? 'accent' : 'textMuted'}>
                        {packageLabel(candidate)}
                      </MonoLabel>
                      {candidate.packageType === 'ANNUAL' ? (
                        <MonoLabel color="success">Best value</MonoLabel>
                      ) : null}
                    </Inline>
                    <AppText variant="heading">{candidate.product.priceString}</AppText>
                    <AppText color="textDim" variant="caption">
                      {packageCadence(candidate)}
                    </AppText>
                  </Stack>
                  <View style={[styles.selector, isSelected && styles.selectorSelected]} />
                </Pressable>
              );
            })}
          </Stack>
        ) : (
          <View style={styles.unavailable}>
            <MonoLabel color="warning">STORE CHANNEL UNAVAILABLE</MonoLabel>
            <AppText color="textMuted" variant="bodySmall">
              {error ?? 'No subscription packages were returned for this storefront.'}
            </AppText>
            <Button
              label="Retry store connection"
              onPress={() => void refresh()}
              variant="secondary"
            />
          </View>
        )}

        {error && packages.length ? (
          <AppText accessibilityRole="alert" color="danger" variant="bodySmall">
            {error}
          </AppText>
        ) : null}

        <Stack gap="x3">
          <Button
            disabled={!activePackage}
            icon={ShieldCheck}
            label={
              activePackage
                ? `Start with ${activePackage.product.priceString}`
                : 'Connecting to store'
            }
            loading={busy || access === 'unknown'}
            onPress={() => void startProtocol()}
          />
          <Button
            disabled={busy}
            label="Restore purchases"
            onPress={() => void restoreAccess()}
            variant="secondary"
          />
        </Stack>

        <AppText color="textDim" variant="caption">
          Payment is charged to your Apple or Google account after any eligible trial. The
          subscription renews automatically unless cancelled in your store account before renewal.
          Restore does not create a new charge.
        </AppText>
        <Inline gap="x3">
          <Button
            label="Terms"
            onPress={() => void openPublicDocument('terms')}
            style={styles.legalButton}
            variant="ghost"
          />
          <Button
            label="Privacy"
            onPress={() => void openPublicDocument('privacy')}
            style={styles.legalButton}
            variant="ghost"
          />
        </Inline>
      </Stack>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: spacing.x6, paddingBottom: spacing.x10 },
  trialPanel: {
    gap: spacing.x2,
    padding: spacing.x5,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radii.panel,
    backgroundColor: colors.accentWash,
  },
  benefit: { flex: 1 },
  package: {
    minHeight: 102,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.x4,
    padding: spacing.x4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  packageSelected: { borderColor: colors.accent },
  packageCopy: { flex: 1 },
  selector: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: colors.textDim,
    borderRadius: 9,
  },
  selectorSelected: {
    borderWidth: 5,
    borderColor: colors.accent,
  },
  unavailable: {
    gap: spacing.x3,
    padding: spacing.x4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
  },
  pressed: { opacity: 0.72 },
  legalButton: { flex: 1 },
});
