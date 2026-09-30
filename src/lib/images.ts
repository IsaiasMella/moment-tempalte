/**
 * Build-time data for content images (album covers, photographs, page images).
 *
 * Why not `<Image />` from `astro:assets`? Content images are *public paths*
 * stored as strings by the CMS, not `import`ed files, so Astro cannot optimise
 * them itself. Instead this module reads each file once with sharp (at build)
 * and returns its intrinsic width/height plus a srcset, which
 * `src/components/ResponsiveImage.astro` turns into an `<img>`. Width and height
 * are always set, so the browser reserves the space and nothing shifts.
 *
 * Two kinds of files:
 * - `/_astro/<name>.<hash>_<id>.webp`: photographs shipped with the theme, which
 *   already come with pre-rendered width variants (same `<name>.<hash>` prefix).
 *   They are indexed from disk, so srcsets list the real files.
 * - Anything else in `public/` (CMS uploads in `/uploads/…`): resized at build
 *   time by the endpoint `src/pages/story/media/[file].ts` into
 *   `/story/media/<key>-<width>.webp` (+ a 1200×630 `-og.jpg` social card).
 *
 * React/Next.js equivalent: what `next/image` does for you with a custom loader —
 * here it is spelled out: read size → pick widths → emit srcset.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const astroDir = path.join(publicDir, '_astro');

/** URL folder of the generated variants of uploaded images. */
export const MEDIA_BASE = '/story/media/';
/** Widths generated for uploaded images (plus the original, capped at UPLOAD_MAX). */
const UPLOAD_WIDTHS = [400, 600, 800, 900, 1200, 1600, 2000, 2400];
const UPLOAD_MAX = 2400;

/** srcset widths per rendering context, as used by the theme. */
export const WIDTHS = {
  hero: [800, 1200, 1600, 2000, 2400],
  next: [800, 1200, 1600, 2000],
  tile: [400, 600, 900, 1200, 1600, 2000],
  regular: [600, 900, 1200, 1600],
  wide: [600, 900, 1200, 1600, 2000],
  full: [600, 900, 1200, 1600, 2000, 2400],
  gallery: [400, 600, 900, 1200, 1600, 2000],
  studio: [600, 900, 1200, 1600],
  testimonial: [480, 720, 960],
} as const;

export interface ImageData {
  /** URL for the `src` attribute. */
  src: string;
  /** Intrinsic size; undefined only when the file could not be read (e.g. a remote URL). */
  width?: number;
  height?: number;
  /** Available widths -> URL. */
  variants: Map<number, string>;
  /** 1200×630 JPEG for social cards, when one exists or can be generated. */
  og?: string;
  /** Source file on disk to resize (uploads only). */
  source?: string;
}

/* ------------------------------------------------ pre-rendered /_astro files */

interface Variant { file: string; width: number; height: number; format: string }
let astroIndex: Promise<Map<string, Variant[]>> | undefined;

/** Groups the files in public/_astro by their `<name>.<hash>` prefix. */
function indexAstroDir(): Promise<Map<string, Variant[]>> {
  astroIndex ??= (async () => {
    const groups = new Map<string, Variant[]>();
    if (!fs.existsSync(astroDir)) return groups;
    const files = fs.readdirSync(astroDir).filter((file) => /\.(webp|jpe?g|png|avif)$/i.test(file));
    await Promise.all(files.map(async (file) => {
      const cut = file.lastIndexOf('_');
      if (cut < 0) return;
      try {
        const meta = await sharp(path.join(astroDir, file)).metadata();
        if (!meta.width || !meta.height) return;
        const key = file.slice(0, cut);
        groups.set(key, [...(groups.get(key) ?? []), { file, width: meta.width, height: meta.height, format: meta.format ?? '' }]);
      } catch { /* unreadable file: ignore */ }
    }));
    return groups;
  })();
  return astroIndex;
}

/* ------------------------------------------------------------- local files */

/** Resolves a public URL path (`/uploads/a.jpg`) to a file on disk, if it exists. */
export function localFile(src: string): string | undefined {
  if (!src.startsWith('/') || src.startsWith('//')) return undefined;
  const file = path.join(publicDir, decodeURI(src.split(/[?#]/)[0]));
  if (!file.startsWith(publicDir)) return undefined;
  return fs.existsSync(file) ? file : undefined;
}

/** Stable, URL-safe name for the variants of a local image. */
const mediaKey = (src: string) =>
  src.replace(/^\/+/, '').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();

const variantUrl = (src: string, width: number) => `${MEDIA_BASE}${mediaKey(src)}-${width}.webp`;
const ogUrl = (src: string) => `${MEDIA_BASE}${mediaKey(src)}-og.jpg`;

/** Widths generated for an uploaded image of the given original width. */
function uploadWidths(originalWidth: number): number[] {
  const cap = Math.min(originalWidth, UPLOAD_MAX);
  return [...new Set([...UPLOAD_WIDTHS.filter((width) => width < cap), cap])];
}

/* ------------------------------------------------------------------ public */

const cache = new Map<string, Promise<ImageData>>();

/** Size, variants and social card of an image (cached per build). */
export function getImageData(src: string): Promise<ImageData> {
  let data = cache.get(src);
  if (!data) cache.set(src, (data = resolve(src)));
  return data;
}

async function resolve(src: string): Promise<ImageData> {
  const astro = src.match(/^\/_astro\/([^/]+)_[^_/]+\.webp$/);
  if (astro) {
    const group = (await indexAstroDir()).get(astro[1]);
    const own = group?.find((entry) => `/_astro/${entry.file}` === src);
    if (group && own) {
      const variants = new Map<number, string>();
      for (const entry of group) if (entry.format === 'webp') variants.set(entry.width, `/_astro/${entry.file}`);
      const og = group.find((entry) => entry.format === 'jpeg' && entry.width === 1200 && entry.height === 630);
      return { src, width: own.width, height: own.height, variants, og: og ? `/_astro/${og.file}` : ogUrl(src) };
    }
  }
  const file = localFile(src);
  if (!file) return { src, variants: new Map() };
  try {
    const meta = await sharp(file).metadata();
    if (!meta.width || !meta.height) throw new Error('no size');
    // EXIF orientations 5–8 swap the displayed dimensions.
    const [w, h] = (meta.orientation ?? 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height];
    // `astro dev` has no build step for the variants endpoint: serve the original.
    if (import.meta.env.DEV) return { src, width: w, height: h, variants: new Map() };
    const width = Math.min(w, UPLOAD_MAX);
    const height = Math.round((h * width) / w);
    const variants = new Map(uploadWidths(w).map((size) => [size, variantUrl(src, size)] as const));
    return { src: variantUrl(src, width), width, height, variants, og: ogUrl(src), source: file };
  } catch {
    return { src, variants: new Map() };
  }
}

/**
 * `srcset` for the widths wanted, each capped to the original width (like
 * Astro's image service) and skipped when no such variant exists.
 * `'lightbox'` = 1200, 1600 and the original, for the full-screen viewer.
 */
export function srcsetFor(image: ImageData, widths: readonly number[] | 'lightbox'): string {
  if (!image.width || !image.variants.size) return '';
  const list = widths === 'lightbox' ? [1200, 1600, image.width] : widths;
  const seen = new Set<number>();
  const parts: string[] = [];
  for (const wanted of list) {
    const width = Math.min(wanted, image.width);
    if (seen.has(width)) continue;
    seen.add(width);
    const url = image.variants.get(width);
    if (url) parts.push(`${url} ${width}w`);
  }
  return parts.join(', ');
}

/**
 * `sizes` for a full-bleed image that covers a box `factor`vh tall: while the
 * viewport is narrower than the photo's aspect ratio the image is cropped at the
 * sides, so it renders wider than 100vw (e.g. `(max-aspect-ratio: 2400/1600) 150vh, 100vw`).
 */
export function coverSizes(image: ImageData, factor: number): string {
  if (!image.width || !image.height) return '100vw';
  const vh = Number(((image.width * factor) / image.height).toFixed(2));
  return `(max-aspect-ratio: ${image.width * factor}/${image.height * 100}) ${vh}vh, 100vw`;
}
