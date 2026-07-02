import privacyPolicy from "../../../../docs/legal/PRIVACY_POLICY.md?raw";
import { LegalMarkdown } from "../../widgets/legal/LegalMarkdown";
import { SEOHead } from "@/shared/ui/SEOHead";

export const PrivacyPolicyPage = () => {
  return (
    <>
      <SEOHead
        title="개인정보처리방침 - FlashHook"
        description="FlashHook 서비스의 개인정보처리방침에 대해 알아보세요."
      />
      <LegalMarkdown source={privacyPolicy} />
    </>
  );
};
