// eslint-disable-next-line no-restricted-imports
import termsOfService from "../../../../docs/legal/TERMS_OF_SERVICE.md?raw";
import { LegalMarkdown } from "@/widgets/legal/LegalMarkdown";
import { SEOHead } from "@/shared/ui/SEOHead";

export const TermsOfServicePage = () => {
  return (
    <>
      <SEOHead
        title="이용약관 - FlashHook"
        description="FlashHook 서비스의 이용약관에 대해 알아보세요."
      />
      <LegalMarkdown source={termsOfService} />
    </>
  );
};
