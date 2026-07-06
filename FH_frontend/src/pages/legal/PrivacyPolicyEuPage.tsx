import privacyPolicyEu from "../../../../docs/legal/PRIVACY_POLICY_EU.md?raw";
import { LegalMarkdown } from "@/widgets/legal/LegalMarkdown";
import { SEOHead } from "@/shared/ui/SEOHead";

export const PrivacyPolicyEuPage = () => {
  return (
    <>
      <SEOHead
        title="Privacy Notice (EU) - FlashHook"
        description="FlashHook's GDPR compliant Privacy Notice for users in EEA, UK, and Switzerland."
      />
      <LegalMarkdown source={privacyPolicyEu} />
    </>
  );
};
