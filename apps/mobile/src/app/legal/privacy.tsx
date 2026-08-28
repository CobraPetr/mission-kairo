import { AppText, Stack } from '@/ui/primitives';
import { LegalDocumentScreen } from '@/ui/patterns/legal-document-screen';
import { SectionPanel } from '@/ui/patterns/section-panel';

export default function PrivacyScreen() {
  return (
    <LegalDocumentScreen
      code="LEGAL // PRIVACY"
      subtitle="What Mission Kairo collects, why it is needed, and how you stay in control."
      title="PRIVACY POLICY"
    >
      <SectionPanel label="DATA WE PROCESS">
        <AppText color="textMuted" variant="bodySmall">
          We process account details, your private onboarding answers, selected goals, plan state,
          completed missions, XP, streaks, and purchase-entitlement status. The v1.0 beta does not
          collect progress photos, precise location, contacts, advertising identifiers, public chat,
          or AI conversation history.
        </AppText>
      </SectionPanel>
      <SectionPanel label="WHY WE USE IT">
        <AppText color="textMuted" variant="bodySmall">
          This data creates and restores your protocol, records mission execution, prevents
          duplicate XP, secures your account, provides customer support, and confirms paid access.
          We do not sell personal data or use private answers for targeted advertising.
        </AppText>
      </SectionPanel>
      <SectionPanel label="SERVICE PROVIDERS">
        <Stack gap="x3">
          <AppText color="textMuted" variant="bodySmall">
            Supabase provides authentication, database, and Edge Function infrastructure.
          </AppText>
          <AppText color="textMuted" variant="bodySmall">
            Apple or Google processes store payments. RevenueCat synchronizes purchase entitlements.
          </AppText>
          <AppText color="textMuted" variant="bodySmall">
            Expo Observe receives production performance measurements and software error details.
            Mission Kairo does not attach account identifiers, email addresses, or private answers
            to those reports.
          </AppText>
        </Stack>
      </SectionPanel>
      <SectionPanel label="RETENTION & CONTROL">
        <AppText color="textMuted" variant="bodySmall">
          Account data is kept while your account is active and only as long afterward as needed for
          security, legal, or billing obligations. You can permanently delete the account from
          Profile → Account. Store subscriptions must be cancelled separately through Apple or
          Google. Release builds publish the operator contact on the public support page.
        </AppText>
      </SectionPanel>
      <SectionPanel label="AGE & HEALTH DATA">
        <AppText color="textMuted" variant="bodySmall">
          The public beta is for adults aged 18 or older. Weight, body-build selections, confidence
          goals, and relationship goals are private self-improvement inputs. Mission Kairo is not a
          medical service and does not diagnose or treat any condition.
        </AppText>
      </SectionPanel>
    </LegalDocumentScreen>
  );
}
