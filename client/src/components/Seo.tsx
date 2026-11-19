import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../lib/env';
import { serializeJsonLd } from '../lib/jsonld';
import { useSettings } from '../context/SettingsContext';
import { resolveImageUrl } from '../lib/images';

interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function Seo({ title, description, path = '', image, type = 'website', noIndex = false, jsonLd }: SeoProps) {
  const { settings } = useSettings();
  const fullTitle = title.includes(settings.businessName) || title.includes('Herb & Hue')
    ? title
    : `${title} — ${settings.businessName}`;
  const metaDescription = description || settings.seo.description || settings.shortDescription;
  const canonicalBase = settings.seo.canonicalUrl || SITE_URL;
  const canonical = `${canonicalBase.replace(/\/$/, '')}${path}`;
  const ogImage = resolveImageUrl(image || settings.seo.ogImage || '/images/og-herb-and-hue.svg');
  const absoluteImage = ogImage.startsWith('http') ? ogImage : `${canonicalBase.replace(/\/$/, '')}${ogImage}`;

  const jsonLdContent = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {noIndex ? <meta name="robots" content="noindex,nofollow" /> : <meta name="robots" content="index,follow" />}
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={settings.businessName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={absoluteImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={absoluteImage} />

      {jsonLdContent?.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(entry) }}
        />
      ))}
    </Helmet>
  );
}
