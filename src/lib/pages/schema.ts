import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Editable page content (Sveltia CMS). Each page is one YAML file:
 *   src/content/settings/site.yml  -> collection `siteSettings`, entry `site`
 *   src/content/pages/<page>.yml   -> collection `<page>Page`,   entry `<page>`
 * Images are public paths (`/_astro/...` for the originals, `/uploads/...` for CMS uploads).
 */

const text = z.string().default('');
const image = z.string().default('');
const link = z.object({ label: text, href: text });

const seo = z.object({ title: text, description: text }).default({ title: '', description: '' });

export const socialPlatforms = [
  'instagram', 'pinterest', 'email', 'phone', 'facebook', 'tiktok', 'youtube',
  'vimeo', 'whatsapp', 'linkedin', 'threads', 'x', 'behance', 'website',
] as const;

export const siteSettingsSchema = z.object({
  name: text,
  tagline: text,
  photographer: text,
  email: text,
  phone: text,
  location: text,
  locationNote: text,
  logo: image,
  seo: z.object({ description: text, ogImage: image, ogImageAlt: text }).default({ description: '', ogImage: '', ogImageAlt: '' }),
  socials: z.array(z.object({
    platform: z.enum(socialPlatforms).default('website'),
    label: text,
    url: text,
  })).default([]),
  nav: z.object({
    primary: z.array(link).default([]),
    secondaryHeading: text,
    secondary: z.array(link).default([]),
  }).default({ primary: [], secondaryHeading: '', secondary: [] }),
  footer: z.object({
    signupTitle: text,
    signupText: text,
    signupPlaceholder: text,
    signupButton: text,
    description: text,
    columns: z.array(z.object({ heading: text, links: z.array(link).default([]) })).default([]),
    copyright: text,
    credit: text,
  }).default({ signupTitle: '', signupText: '', signupPlaceholder: '', signupButton: '', description: '', columns: [], copyright: '', credit: '' }),
  forms: z.object({ enquiryAction: text, newsletterAction: text }).default({ enquiryAction: '', newsletterAction: '' }),
});

export const homePageSchema = z.object({
  seo,
  heading: text,
  studio: z.object({
    image,
    imageAlt: text,
    title: text,
    text,
    buttonLabel: text,
    buttonLink: text,
    figures: z.array(z.object({ label: text, value: text })).default([]),
  }),
  testimonials: z.object({
    title: text,
    items: z.array(z.object({
      quote: text,
      names: text,
      category: text,
      context: text,
      image,
      imageAlt: text,
    })).default([]),
  }),
  cta: z.object({ title: text, text, buttonLabel: text, buttonLink: text }),
});

export const studioPageSchema = z.object({
  seo,
  title: text,
  lede: text,
  image,
  imageAlt: text,
  body: text,
});

export const pricingPageSchema = z.object({
  seo,
  title: text,
  lede: text,
  packages: z.array(z.object({
    name: text,
    priceNote: text,
    price: text,
    summary: text,
    featured: z.boolean().default(false),
    badge: text,
    includesTitle: text,
    includes: z.array(z.string()).default([]),
    buttonLabel: text,
    buttonLink: text,
  })).default([]),
  note: text,
});

export const contactPageSchema = z.object({
  seo,
  title: text,
  lede: text,
  emailHeading: text,
  sections: z.array(z.object({ heading: text, text })).default([]),
  basedLabel: text,
  phoneLabel: text,
  followLabel: text,
  form: z.object({
    nameLabel: text,
    emailLabel: text,
    dateLabel: text,
    placeLabel: text,
    messageLabel: text,
    buttonLabel: text,
  }),
});

export const privacyPageSchema = z.object({
  seo,
  title: text,
  lede: text,
  body: text,
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type HomePage = z.infer<typeof homePageSchema>;
export type StudioPage = z.infer<typeof studioPageSchema>;
export type PricingPage = z.infer<typeof pricingPageSchema>;
export type ContactPage = z.infer<typeof contactPageSchema>;
export type PrivacyPage = z.infer<typeof privacyPageSchema>;

const page = (id: string) => glob({ pattern: `${id}.yml`, base: './src/content/pages' });

export const pageCollections = {
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
