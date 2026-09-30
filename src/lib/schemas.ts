/**
 * Zod schemas (and their TypeScript types) for every content collection.
 *
 * Kept apart from `src/content.config.ts` so plain modules can import the
 * types and constants (e.g. `CATEGORIES`) without pulling in the collection
 * definitions. The field shapes mirror `public/admin/config.yml` (Sveltia CMS):
 * change both together.
 *
 * React/Next.js equivalent: the zod schemas you would write to validate
 * CMS/API data before rendering it.
 */
import { z } from 'astro/zod';

// ---------------------------------------------------------------- albums

/** Categories with a collection page (/collection/<value>/). */
export const CATEGORIES = { weddings: 'Weddings', portraits: 'Portraits' } as const;
export type Category = keyof typeof CATEGORIES;

const trimmed = z.string().trim();
const optionalText = z.string().trim().optional().nullable().transform((value) => value || undefined);

/**
 * Images are public paths: existing photographs live in /_astro/…,
 * CMS uploads in /uploads/… (public/uploads).
 */
export const imageSchema = z.object({
  src: trimmed.min(1),
  alt: trimmed.default(''),
  caption: optionalText,
  credit: optionalText,
});

export const blockSchema = z.discriminatedUnion('type', [
  /** Paragraphs in Markdown (blank line = new paragraph; **bold**, *italic*, [links](/url)). */
  z.object({ type: z.literal('text'), body: trimmed.min(1) }),
  /** Section heading (h2); its anchor id is generated from the text. */
  z.object({ type: z.literal('heading'), text: trimmed.min(1) }),
  /** One photograph. regular = reading width, wide = wider than text, full = edge to edge. */
  imageSchema.extend({
    type: z.literal('image'),
    size: z.enum(['regular', 'wide', 'full']).default('wide'),
  }),
  /** Pull quote with optional attribution. */
  z.object({
    type: z.literal('quote'),
    text: trimmed.min(1),
    author: optionalText,
    style: z.enum(['default', 'alt']).default('default'),
  }),
  /** Justified photo gallery; order = display order. */
  z.object({
    type: z.literal('gallery'),
    caption: optionalText,
    images: z.array(imageSchema).min(1),
  }),
]);

/** One wedding or portrait session: src/content/albums/<slug>.md, served at /story/<slug>/. */
export const albumSchema = z.object({
  title: trimmed.min(1),
  date: z.coerce.date(),
  updated: z.coerce.date().optional().nullable().transform((value) => value ?? undefined),
  category: z.enum(Object.keys(CATEGORIES) as [Category, ...Category[]]),
  location: trimmed.default(''),
  layout: z.enum(['story', 'note']).default('story'),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  tags: z.array(trimmed).nullable().default([]).transform((value) => value ?? []),
  cover: z.object({ src: trimmed.min(1), alt: trimmed.default('') }),
  lede: trimmed.min(1),
  description: optionalText,
  blocks: z.array(blockSchema).nullable().default([]).transform((value) => value ?? []),
});

export type Album = z.infer<typeof albumSchema>;
export type AlbumBlock = z.infer<typeof blockSchema>;
export type AlbumImage = z.infer<typeof imageSchema>;

// ---------------------------------------------------------------- pages & settings

/** Every page field is optional in the CMS, so strings default to ''. */
const text = z.string().default('');
const image = z.string().default('');
const link = z.object({ label: text, href: text });
export type Link = z.infer<typeof link>;

const seo = z.object({ title: text, description: text }).default({ title: '', description: '' });

export const socialPlatforms = [
  'instagram', 'pinterest', 'email', 'phone', 'facebook', 'tiktok', 'youtube',
  'vimeo', 'whatsapp', 'linkedin', 'threads', 'x', 'behance', 'website',
] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];

/** Global settings: src/content/settings/site.yml. */
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
export type SocialLink = SiteSettings['socials'][number];
export type HomePage = z.infer<typeof homePageSchema>;
export type StudioPage = z.infer<typeof studioPageSchema>;
export type PricingPage = z.infer<typeof pricingPageSchema>;
export type ContactPage = z.infer<typeof contactPageSchema>;
export type PrivacyPage = z.infer<typeof privacyPageSchema>;
