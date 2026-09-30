/**
 * Small helpers derived from the site settings (links, titles, structured data),
 * shared by the layout and components.
 */
import type { SiteSettings, SocialLink } from './schemas';

/** "Privacy" -> "Privacy | Moments"; an empty title falls back to the site name. */
export const pageTitle = (title: string, settings: SiteSettings): string =>
  title ? `${title} | ${settings.name}` : settings.name;

/**
 * Whether a nav link points at the current page or its section
 * (e.g. /work/ stays current on /work/2/). Used for `aria-current="page"`.
 */
export const isCurrentLink = (href: string, pathname: string): boolean =>
  href === pathname || (href.length > 1 && href.endsWith('/') && pathname.startsWith(href));

/** A social link's URL; email and phone fall back to the settings' address and number. */
export function socialHref(social: SocialLink, settings: SiteSettings): string {
  if (social.url) return social.url;
  if (social.platform === 'email') return `mailto:${settings.email}`;
  if (social.platform === 'phone') return `tel:${settings.phone.replace(/[^\d+]/g, '')}`;
  return '#';
}

/** Accessible name of a social link: its label, or the capitalised platform. */
export const socialLabel = (social: SocialLink): string =>
  social.label || social.platform.charAt(0).toUpperCase() + social.platform.slice(1);

/** Resolves a path (or keeps an absolute URL) against the site origin. */
export const absoluteUrl = (value: string, site: URL): string => new URL(value, site).href;

/**
 * schema.org `WebSite` + studio `Organization`, the JSON-LD most pages carry.
 * `site` is `Astro.site` (the SITE_URL origin).
 */
export function websiteJsonLd(settings: SiteSettings, site: URL): Record<string, unknown> {
  const origin = site.origin;
  const sameAs = settings.socials
    .filter((social) => social.platform !== 'email' && social.platform !== 'phone')
    .map((social) => socialHref(social, settings))
    .filter((url) => /^https?:\/\//.test(url));
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: settings.name,
    alternateName: settings.tagline,
    url: origin,
    description: settings.seo.description,
    inLanguage: 'en',
    publisher: {
      '@type': ['Organization', 'ProfessionalService'],
      '@id': `${origin}/#studio`,
      name: settings.name,
      url: origin,
      description: settings.seo.description,
      founder: { '@type': 'Person', name: settings.photographer },
      logo: { '@type': 'ImageObject', url: absoluteUrl(settings.seo.ogImage || '/og-image.jpg', site) },
      sameAs,
    },
  };
}

/** schema.org `BreadcrumbList`: Home › …crumbs. Each crumb URL is a site path. */
export function breadcrumbJsonLd(settings: SiteSettings, site: URL, crumbs: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: settings.name, path: '/' }, ...crumbs].map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path, site),
    })),
  };
}
