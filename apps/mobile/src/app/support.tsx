import { AppText } from '@/ui/primitives';
import { LegalDocumentScreen } from '@/ui/patterns/legal-document-screen';
import { SectionPanel } from '@/ui/patterns/section-panel';

export default function SupportScreen() {
  return (
    <LegalDocumentScreen
      code="SUPPORT // PUBLIC"
      subtitle="Fast paths for access, billing, privacy, and account control."
      title="MISSION SUPPORT"
    >
      <SectionPanel label="ACCOUNT ACCESS">
        <AppText color="textMuted" variant="bodySmall">
          Use Restore access on the landing page to sign in. Use Forgot password to request a new
          recovery link. If a confirmation email does not arrive, check spam before requesting
          another message.
        </AppText>
      </SectionPanel>
      <SectionPanel label="PURCHASES">
        <AppText color="textMuted" variant="bodySmall">
          Use Restore Purchases if you already subscribed with the current Apple or Google account.
          Billing, cancellation, refunds, and renewal are managed by the store where you purchased.
        </AppText>
      </SectionPanel>
      <SectionPanel label="DELETE ACCOUNT">
        <AppText color="textMuted" variant="bodySmall">
          Open Profile → Account → Delete account. This removes the authentication record and
          cascades through private Mission Kairo data. Cancel a store subscription separately.
        </AppText>
      </SectionPanel>
      <SectionPanel label="CONTACT">
        <AppText color="textMuted" variant="bodySmall">
          Production builds require a public support URL with the verified operator contact before
          they can be created. The development preview intentionally does not publish a personal
          support address.
        </AppText>
      </SectionPanel>
    </LegalDocumentScreen>
  );
}
