import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Albums ("stories"): one file per wedding or portrait session at
 * src/content/albums/<slug>.md, all content in YAML front matter.
 * The file name is the URL: /story/<slug>/.
 *
 * Images are public paths: existing photographs live in /_astro/…,
 * CMS uploads in /uploads/… (public/uploads). Responsive sizes are
 * derived automatically at build time.
 */

/** Categories with a collection page (/collection/<value>/). */
export const CATEGORIES = { weddings: 'Weddings', portraits: 'Portraits' } as const;

const text = z.string().trim();
const optionalText = z.string().trim().optional().nullable().transform((value) => value || undefined);

export const imageSchema = z.object({
  src: text.min(1),
  alt: text.default(''),
  caption: optionalText,
  credit: optionalText,
});

export const blockSchema = z.discriminatedUnion('type', [
  /** Paragraphs in Markdown (blank line = new paragraph; **bold**, *italic*, [links](/url)). */
  z.object({ type: z.literal('text'), body: text.min(1) }),
  /** Section heading (h2); its anchor id is generated from the text. */
  z.object({ type: z.literal('heading'), text: text.min(1) }),
  /** One photograph. regular = reading width, wide = wider than text, full = edge to edge. */
  imageSchema.extend({
    type: z.literal('image'),
    size: z.enum(['regular', 'wide', 'full']).default('wide'),
  }),
  /** Pull quote with optional attribution. */
  z.object({
    type: z.literal('quote'),
    text: text.min(1),
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

export const albumSchema = z.object({
  title: text.min(1),
  date: z.coerce.date(),
  updated: z.coerce.date().optional().nullable().transform((value) => value ?? undefined),
  category: z.enum(Object.keys(CATEGORIES) as [keyof typeof CATEGORIES, ...(keyof typeof CATEGORIES)[]]),
  location: text.default(''),
  layout: z.enum(['story', 'note']).default('story'),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  tags: z.array(text).nullable().default([]).transform((value) => value ?? []),
  cover: z.object({ src: text.min(1), alt: text.default('') }),
  lede: text.min(1),
  description: optionalText,
  blocks: z.array(blockSchema).nullable().default([]).transform((value) => value ?? []),
});

export type Album = z.infer<typeof albumSchema>;
export type AlbumBlock = z.infer<typeof blockSchema>;
export type AlbumImage = z.infer<typeof imageSchema>;

export const albumCollections = {
  albums: defineCollection({
    loader: glob({ pattern: '**/[^_]*.{md,mdx,yml,yaml}', base: './src/content/albums' }),
    schema: albumSchema,
  }),
};
