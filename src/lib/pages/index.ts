import { getEntry } from 'astro:content';
import type { ContactPage, HomePage, PricingPage, PrivacyPage, SiteSettings, StudioPage } from './schema';
import { applySiteSettings } from './site';
import * as content from './content';

/** Routes rendered by dedicated Astro pages (src/pages/*.astro) instead of the reference catch-all. */
const astroRoutes = new Set(['privacy/', '404/']);

export function isGeneratedRoute(route: string): boolean {
  return astroRoutes.has(route);
}

async function data<T>(collection: string, id: string): Promise<T | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = await getEntry(collection as any, id);
  if (!entry) console.warn(`[pages] missing content entry ${collection}/${id}; reference content kept`);
  return entry?.data as T | undefined;
}

export const getSiteSettings = () => data<SiteSettings>('siteSettings', 'site');

/** Page title as shown in the breadcrumb JSON-LD, for the pages this module owns. */
const crumbs: Record<string, string> = { 'studio/': 'studioPage', 'pricing/': 'pricingPage', 'contact/': 'contactPage', 'privacy/': 'privacyPage' };

/**
 * Applies the global site settings to any page HTML (header, drawer, footer, socials, SEO defaults,
 * JSON-LD, form endpoints). Exported so dedicated routes (e.g. generated story pages) can reuse it.
 */
export async function applyGlobalSettings(route: string, html: string): Promise<string> {
  const settings = await getSiteSettings();
  return settings ? applySiteSettings(route, html, settings) : html;
}

/** Rewrites a reference page's HTML with editable content. */
export async function transform(route: string, html: string): Promise<string> {
  const settings = await getSiteSettings();
  if (!settings) return html;

  switch (route) {
    case '': {
      const page = await data<HomePage>('homePage', 'home');
      if (page) html = content.home(html, page);
      break;
    }
    case 'studio/': {
      const page = await data<StudioPage>('studioPage', 'studio');
      if (page) html = content.studio(html, page, settings);
      break;
    }
    case 'pricing/': {
      const page = await data<PricingPage>('pricingPage', 'pricing');
      if (page) html = content.pricing(html, page, settings);
      break;
    }
    case 'contact/': {
      const page = await data<ContactPage>('contactPage', 'contact');
      if (page) html = content.contact(html, page, settings);
      break;
    }
    case 'privacy/': {
      const page = await data<PrivacyPage>('privacyPage', 'privacy');
      if (page) html = content.privacy(html, page, settings);
      break;
    }
  }

  let crumb: { url: string; name: string } | undefined;
  if (crumbs[route]) {
    const page = await data<{ seo: { title: string } }>(crumbs[route], route.slice(0, -1));
    if (page?.seo.title) crumb = { url: `/${route}`, name: page.seo.title };
  }
  return applySiteSettings(route, html, settings, crumb);
}
