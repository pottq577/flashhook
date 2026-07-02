import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  children?: React.ReactNode;
}

export function SEOHead({ title, description, canonicalPath, children }: SEOHeadProps) {
  const location = useLocation();
  const path = canonicalPath !== undefined ? canonicalPath : location.pathname;
  // Ensure we don't end up with double slashes
  const canonicalUrl = `https://www.flashhook.site${path === "/" ? "" : path}`;

  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonicalUrl} />
      {children}
    </Helmet>
  );
}
