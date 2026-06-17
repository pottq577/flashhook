import privacyPolicy from "../../../../docs/legal/PRIVACY_POLICY.md?raw";
import { LegalMarkdown } from "../../widgets/legal/LegalMarkdown";

export const PrivacyPolicyPage = () => {
  return <LegalMarkdown source={privacyPolicy} />;
};
