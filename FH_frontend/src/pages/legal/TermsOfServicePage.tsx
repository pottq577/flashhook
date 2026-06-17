import termsOfService from "../../../../docs/legal/TERMS_OF_SERVICE.md?raw";
import { LegalMarkdown } from "../../widgets/legal/LegalMarkdown";

export const TermsOfServicePage = () => {
  return <LegalMarkdown source={termsOfService} />;
};
