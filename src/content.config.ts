/**
 * Content collections: the editable content managed from Sveltia CMS (/admin).
 * Astro validates every file against its schema at build time, so a broken
 * CMS edit fails the build instead of the page.
 *
 *   src/content/albums/<slug>.md      -> `albums`      (one entry per story)
 *   src/content/settings/site.yml     -> `siteSettings` (entry `site`)
 *   src/content/pages/<page>.yml      -> `<page>Page`   (entry `<page>`)
 *
 * Read them through the typed helpers in `src/lib/content.ts`.
 * React/Next.js equivalent: a typed data layer (e.g. Contentlayer / a CMS SDK).
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  albumSchema,
  contactPageSchema,
  homePageSchema,
  pricingPageSchema,
  privacyPageSchema,
  siteSettingsSchema,
  studioPageSchema,
} from './lib/schemas';

/** A single-file collection for one page: src/content/pages/<id>.yml. */
const page = (id: string) => glob({ pattern: `${id}.yml`, base: './src/content/pages' });

export const collections = {
  albums: defineCollection({
    loader: glob({ pattern: '**/[^_]*.{md,mdx,yml,yaml}', base: './src/content/albums' }),
    schema: albumSchema,
  }),
  siteSettings: defineCollection({
    loader: glob({ pattern: 'site.yml', base: './src/content/settings' }),
    schema: siteSettingsSchema,
  }),
  homePage: defineCollection({ loader: page('home'), schema: homePageSchema }),
  studioPage: defineCollection({ loader: page('studio'), schema: studioPageSchema }),
  pricingPage: defineCollection({ loader: page('pricing'), schema: pricingPageSchema }),
  contactPage: defineCollection({ loader: page('contact'), schema: contactPageSchema }),
  privacyPage: defineCollection({ loader: page('privacy'), schema: privacyPageSchema }),
};
