import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Responsive image data for album photographs.
 *
 * - Photographs already published in /_astro/ come with pre-rendered width
 *   variants (`<name>.<hash>_<variant>.webp`); they are indexed from disk so the
 *   srcsets match the reference markup exactly.
 * - Any other local image (CMS uploads in public/uploads, …) is resized at
 *   build time by the endpoint in src/pages/story/media/[file].ts, which serves
 *   the variants at MEDIA_BASE.
 */

const publicDir = path.resolve('public');
const astroDir = path.join(publicDir, '_astro');

export const MEDIA_BASE = '/story/media/';
/** Widths generated for uploaded images (plus the capped original). */
export const UPLOAD_WIDTHS = [400, 600, 800, 900, 1200, 1600, 2000, 2400];
const UPLOAD_MAX = 2400;

/** Width lists per rendering context, as used by the theme. */
export const WIDTHS = {
  hero: [800, 1200, 1600, 2000, 2400],
  next: [800, 1200, 1600, 2000],
  tile: [400, 600, 900, 1200, 1600, 2000],
  regular: [600, 900, 1200, 1600],
  wide: [600, 900, 1200, 1600, 2000],
  full: [600, 900, 1200, 1600, 2000, 2400],
  gallery: [400, 600, 900, 1200, 1600, 2000],
} as const;

export interface ImageInfo {
  /** URL for the `src` attribute. */
  src: string;
  width?: number;
  height?: number;
  /** width -> URL */
  variants: Map<number, string>;
  /** 1200×630 JPEG for social cards, when one exists or can be generated. */
  og?: string;
  /** Local source file to resize (uploads only). */
  source?: string;
}

interface Group { files: { file: string; width: number; height: number; format: string }[] }

let registryPromise: Promise<Map<string, Group>> | undefined;

async function astroRegistry(): Promise<Map<string, Group>> {
  registryPromise ??= (async () => {
    const groups = new Map<string, Group>();
    if (!fs.existsSync(astroDir)) return groups;
    const files = fs.readdirSync(astroDir).filter((file) => /\.(webp|jpe?g|png|avif)$/i.test(file));
    await Promise.all(files.map(async (file) => {
      const cut = file.lastIndexOf('_');
      if (cut < 0) return;
      const base = file.slice(0, cut);
      try {
        const meta = await sharp(path.join(astroDir, file)).metadata();
        if (!meta.width || !meta.height) return;
        const group = groups.get(base) ?? { files: [] };
        group.files.push({ file, width: meta.width, height: meta.height, format: meta.format ?? '' });
        groups.set(base, group);
      } catch { /* unreadable file: ignore */ }
    }));
    return groups;
  })();
  return registryPromise;
}

/** Stable, URL-safe key for a local image path. */
export function mediaKey(src: string): string {
  return src.replace(/^\/+/, '').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

/** Resolves a public URL path to a file on disk, if it is local. */
export function localFile(src: string): string | undefined {
  if (!src.startsWith('/') || src.startsWith('//')) return undefined;
  const file = path.join(publicDir, decodeURI(src.split(/[?#]/)[0]));
  if (!file.startsWith(publicDir)) return undefined;
  return fs.existsSync(file) ? file : undefined;
}

const infoCache = new Map<string, Promise<ImageInfo>>();

export function imageInfo(src: string): Promise<ImageInfo> {
  let info = infoCache.get(src);
  if (!info) {
    info = resolveInfo(src);
    infoCache.set(src, info);
  }
  return info;
}

async function resolveInfo(src: string): Promise<ImageInfo> {
  const astro = src.match(/^\/_astro\/([^/]+)_[^_/]+\.webp$/);
  if (astro) {
    const group = (await astroRegistry()).get(astro[1]);
    const own = group?.files.find((entry) => `/_astro/${entry.file}` === src);
    if (group && own) {
      const variants = new Map<number, string>();
      for (const entry of group.files) if (entry.format === 'webp') variants.set(entry.width, `/_astro/${entry.file}`);
      const og = group.files.find((entry) => entry.format === 'jpeg' && entry.width === 1200 && entry.height === 630);
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
    // `astro dev` enforces trailing slashes on endpoints, so serve the original there.
    if (import.meta.env.DEV) return { src, width: w, height: h, variants: new Map() };
    const width = Math.min(w, UPLOAD_MAX);
    const height = Math.round((h * width) / w);
    const variants = new Map<number, string>();
    for (const size of uploadSizes(w)) variants.set(size, variantUrl(src, size));
    return { src: variantUrl(src, width), width, height, variants, og: ogUrl(src), source: file };
  } catch {
    return { src, variants: new Map() };
  }
}

/** Widths generated for an uploaded image of the given original width. */
export function uploadSizes(originalWidth: number): number[] {
  const cap = Math.min(originalWidth, UPLOAD_MAX);
  return [...new Set([...UPLOAD_WIDTHS.filter((w) => w < cap), cap])];
}

export const variantUrl = (src: string, width: number) => `${MEDIA_BASE}${mediaKey(src)}-${width}.webp`;
export const ogUrl = (src: string) => `${MEDIA_BASE}${mediaKey(src)}-og.jpg`;

/** Builds a srcset for the widths wanted, capped to the original like Astro's image service. */
export function srcset(info: ImageInfo, widths: readonly number[] | 'lightbox'): string {
  if (!info.width || !info.variants.size) return '';
  const list = widths === 'lightbox' ? [1200, 1600, info.width] : widths;
  const seen = new Set<number>();
  const parts: string[] = [];
  for (const wanted of list) {
    const width = Math.min(wanted, info.width);
    if (seen.has(width)) continue;
    seen.add(width);
    const url = info.variants.get(width);
    if (url) parts.push(`${url} ${width}w`);
  }
  return parts.join(', ');
}
