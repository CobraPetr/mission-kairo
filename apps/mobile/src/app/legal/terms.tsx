import { AppText, Stack } from '@/ui/primitives';
import { LegalDocumentScreen } from '@/ui/patterns/legal-document-screen';
import { SectionPanel } from '@/ui/patterns/section-panel';

export default function TermsScreen() {
  return (
    <LegalDocumentScreen
      code="LEGAL // TERMS"
      subtitle="The rules for accounts, subscriptions, and safe use of the Mission Kairo service."
      title="TERMS OF USE"
    >
      <SectionPanel label="ELIGIBILITY & ACCOUNT">
        <AppText color="textMuted" variant="bodySmall">
          You must be at least 18 years old for the public beta and provide accurate account
          information. Keep your password and device secure. Do not access another person’s account
          or manipulate mission, XP, or purchase records.
        </AppText>
      </SectionPanel>
      <SectionPanel label="SUBSCRIPTIONS">
        <Stack gap="x3">
          <AppText color="textMuted" variant="bodySmall">
            Available plans, localized prices, introductory-trial eligibility, and the next renewal
            date are shown by Apple or Google before confirmation. Subscriptions renew automatically
            unless cancelled through the applicable store before renewal.
          </AppText>
          <AppText color="textMuted" variant="bodySmall">
            Deleting a Mission Kairo account does not cancel a store-managed subscription. Use
            Manage Subscription in Account or the store’s subscription settings.
          </AppText>
        </Stack>
      </SectionPanel>
      <SectionPanel label="WELLBEING & SAFETY">
        <AppText color="textMuted" variant="bodySmall">
          Mission Kairo provides general self-improvement structure, not medical, mental-health,
          nutritional, financial, or relationship therapy. Stop any activity that feels unsafe and
          seek a qualified professional when appropriate. You remain responsible for adapting tasks
          to your health, environment, and abilities.
        </AppText>
      </SectionPanel>
      <SectionPanel label="SERVICE CHANGES">
        <AppText color="textMuted" variant="bodySmall">
          We may change or discontinue features to protect users, comply with law, or improve the
          service. Material changes to these terms will be communicated before they take effect
          where required. The seller identified in the applicable store listing operates the
          service.
        </AppText>
      </SectionPanel>
    </LegalDocumentScreen>
  );
}
