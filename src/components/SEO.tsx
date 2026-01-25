import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  name?: string;
  type?: string;
  image?: string;
  url?: string;
  canonical?: string;
}

export default function SEO({
  title,
  description,
  name = 'QimteK Hooks',
  type = 'website',
  image = import.meta.env.VITE_SITE_IMAGE,
  url,
  canonical,
}: SEOProps) {
  const siteTitle = 'QimteK Hooks - Real-time Webhook Inspector & Debugger';
  const defaultDescription = 'Generate temporary webhook URLs to capture and inspect HTTP requests in real-time. Free webhook testing tool for developers.';
  const currentUrl = url || window.location.href;
  const fullTitle = title ? `${title} | ${name}` : siteTitle;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <link rel="canonical" href={canonical || currentUrl} />

      {/* Facebook Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content={name} />

      {/* Twitter Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:url" content={currentUrl} />
    </Helmet>
  );
}
