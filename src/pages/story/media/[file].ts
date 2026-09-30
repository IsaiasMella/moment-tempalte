/**
 * Responsive variants for album images that were not pre-rendered by the theme
 * (CMS uploads in public/uploads, …): /story/media/<key>-<width>.webp and a
 * 1200×630 social card /story/media/<key>-og.jpg. Generated at build time.
 */
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { getAlbums } from '../../../lib/albums/data';
import { imageInfo, localFile, MEDIA_BASE } from '../../../lib/albums/images';

export async function getStaticPaths() {
  const albums = await getAlbums();
  const sources = new Set<string>();
  const covers = new Set<string>();
  for (const album of albums) {
    covers.add(album.cover.src);
    sources.add(album.cover.src);
    for (const block of album.blocks) {
      if (block.type === 'image') sources.add(block.src);
      if (block.type === 'gallery') block.images.forEach((image) => sources.add(image.src));
    }
  }
  const paths = new Map<string, { source: string; width?: number; og?: boolean }>();
  for (const src of sources) {
    const info = await imageInfo(src);
    if (info.source) {
      for (const [width, url] of info.variants) {
        if (url.startsWith(MEDIA_BASE)) paths.set(url.slice(MEDIA_BASE.length), { source: info.source, width });
      }
    }
    const file = localFile(src);
    if (covers.has(src) && file && info.og?.startsWith(MEDIA_BASE)) paths.set(info.og.slice(MEDIA_BASE.length), { source: file, og: true });
  }
  return [...paths].map(([file, props]) => ({ params: { file }, props }));
}

export const GET: APIRoute = async ({ props }) => {
  const { source, width, og } = props as { source: string; width?: number; og?: boolean };
  const image = sharp(source).rotate();
  const body = og
    ? await image.resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
    : await image.resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': og ? 'image/jpeg' : 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
