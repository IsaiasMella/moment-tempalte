/**
 * Responsive variants for album images that the theme did not pre-render
 * (CMS uploads in public/uploads, …): /story/media/<key>-<width>.webp and a
 * 1200×630 social card /story/media/<key>-og.jpg, written at build time with sharp.
 * The URLs are chosen by src/lib/images.ts, which the image components use.
 *
 * React/Next.js equivalent: a Route Handler (app/story/media/[file]/route.ts)
 * with `generateStaticParams`, exported as static files (`output: 'export'`).
 */
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { getAlbums } from '../../../lib/content';
import { getImageData, localFile, MEDIA_BASE } from '../../../lib/images';

interface Props { source: string; width?: number; og?: boolean }

export async function getStaticPaths() {
  const albums = await getAlbums();
  const covers = new Set(albums.map((album) => album.cover.src));
  const sources = new Set(covers);
  for (const album of albums) {
    for (const block of album.blocks) {
      if (block.type === 'image') sources.add(block.src);
      if (block.type === 'gallery') block.images.forEach((image) => sources.add(image.src));
    }
  }
  const files = new Map<string, Props>();
  for (const src of sources) {
    const image = await getImageData(src);
    if (image.source) {
      for (const [width, url] of image.variants) {
        if (url.startsWith(MEDIA_BASE)) files.set(url.slice(MEDIA_BASE.length), { source: image.source, width });
      }
    }
    const file = localFile(src);
    if (covers.has(src) && file && image.og?.startsWith(MEDIA_BASE)) files.set(image.og.slice(MEDIA_BASE.length), { source: file, og: true });
  }
  return [...files].map(([file, props]) => ({ params: { file }, props }));
}

export const GET: APIRoute<Props> = async ({ props }) => {
  const { source, width, og } = props;
  const image = sharp(source).rotate(); // honour EXIF orientation
  const body = og
    ? await image.resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
    : await image.resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': og ? 'image/jpeg' : 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
