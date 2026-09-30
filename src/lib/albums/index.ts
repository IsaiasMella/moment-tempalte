import fs from 'node:fs';
import path from 'node:path';
import { albumSummariesSync, getAlbums, tagSlug, type AlbumEntry } from './data';
import { imageInfo, srcset, WIDTHS } from './images';
import { escapeAttr, escapeText, formatMonth, tile } from './render';

/**
 * Albums drive:
 * - every /story/<slug>/ page (src/pages/story/[slug].astro), so the reference
 *   story pages are skipped by the catch-all;
 * - the story grids of the listing pages below, rewritten in `transform`.
 */

export const PAGE_SIZE = 12;
const HOME_HERO = 3;

type Listing =
  | { kind: 'home' }
  | { kind: 'archive'; base: string; label: string; page: number; filter: (album: AlbumEntry) => boolean; paginated: true }
  | { kind: 'archive'; base: string; label: string; page: 1; filter: (album: AlbumEntry) => boolean; paginated: false };

function listingFor(route: string): Listing | undefined {
  if (route === '') return { kind: 'home' };
  let match = route.match(/^work\/(?:(\d+)\/)?$/);
  if (match) return { kind: 'archive', base: '/work', label: 'Work', page: Number(match[1] ?? 1), filter: () => true, paginated: true };
  match = route.match(/^collection\/([^/]+)\/(?:(\d+)\/)?$/);
  if (match) {
    const category = match[1];
    const label = category.charAt(0).toUpperCase() + category.slice(1);
    return { kind: 'archive', base: `/collection/${category}`, label, page: Number(match[2] ?? 1), filter: (album) => album.category === category, paginated: true };
  }
  match = route.match(/^tag\/([^/]+)\/$/);
  if (match) {
    const tag = match[1];
    return { kind: 'archive', base: `/tag/${tag}`, label: tag, page: 1, filter: (album) => album.tags.some((t) => tagSlug(t) === tag), paginated: false };
  }
  return undefined;
}

/** Number of existing (reference) pages for a paginated listing: /base/, /base/2/, … */
function availablePages(base: string): number {
  let pages = 1;
  while (fs.existsSync(path.resolve('src/reference', `${base.slice(1)}/${pages + 1}/index.html`))) pages++;
  return pages;
}

/** Pages that listing actually needs; the last available page absorbs any overflow. */
const pageCount = (total: number, available: number) => Math.min(Math.max(1, Math.ceil(total / PAGE_SIZE)), available);

/** Routes rendered by dedicated pages instead of the reference catch-all. */
export function isGeneratedRoute(route: string): boolean {
  // Every story page is generated from src/content/albums.
  if (/^story\/[^/]+\/$/.test(route)) return true;
  // Drop pagination pages left empty after albums are deleted.
  const listing = listingFor(route);
  if (listing?.kind === 'archive' && listing.paginated && listing.page > 1) {
    const summaries = albumSummariesSync();
    const category = listing.base.startsWith('/collection/') ? listing.base.split('/')[2] : undefined;
    const total = summaries.filter((album) => !category || album.category === category).length;
    return listing.page > pageCount(total, availablePages(listing.base));
  }
  return false;
}

const GRID = /(<div class="grid grid-3 grid-masonry"[^>]*>)(?:<article class="tile"[\s\S]*?<\/article>)*/;

async function homeTransform(html: string): Promise<string> {
  const albums = await getAlbums();
  const featured = albums.filter((album) => album.featured);
  const hero = [...featured, ...albums.filter((album) => !album.featured)].slice(0, HOME_HERO);
  const rest = albums.filter((album) => !hero.includes(album));

  const slides = await Promise.all(hero.map(async (album, index) => {
    const info = await imageInfo(album.cover.src);
    const set = srcset(info, WIDTHS.hero);
    const sizes = info.width && info.height
      ? `(max-aspect-ratio: ${info.width * 100}/${info.height * 100}) ${Number(((info.width * 100) / info.height).toFixed(2))}vh, 100vw`
      : '100vw';
    const image = `<img src="${escapeAttr(info.src)}"${set ? ` srcset="${escapeAttr(set)}"` : ''} alt="${escapeAttr(album.cover.alt)}" sizes="${sizes}"`
      + (index === 0 ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"') + ' decoding="async"'
      + (info.width ? ` width="${info.width}" height="${info.height}"` : '') + '>';
    return `<div class="home-hero-slide${index === 0 ? ' is-current is-staged"' : '" inert'}><div class="home-hero-media">${image}</div><div class="home-hero-scrim"></div>`
      + `<div class="wrap home-hero-body"><p class="label meta-row home-hero-kicker"><span>${escapeText(album.categoryLabel)}</span><span>${formatMonth(album.date)}</span></p>`
      + `<h2 class="display home-hero-title"><a href="${album.url}">${escapeText(album.title)}</a></h2><p class="lede home-hero-excerpt">${escapeText(album.lede)}</p></div></div>`;
  }));
  const dots = hero.map((album, index) => `<li><button type="button" class="home-hero-dot" data-hero-dot aria-current="${index === 0}" aria-label="Show story ${index + 1}: ${escapeAttr(album.title)}"></button></li>`);

  html = html.replace(/(<div class="home-hero-slides"[^>]*data-slides=")\d+("[^>]*>)[\s\S]*?(<\/div><div class="wrap home-hero-controls">)/,
    (_, open, rest2, close) => `${open}${hero.length}${rest2}${slides.join('')}${close}`);
  html = html.replace(/(<ul class="home-hero-dots">)[\s\S]*?(<\/ul>)/, (_, open, close) => `${open}${dots.join('')}${close}`);

  const tiles = await Promise.all(rest.slice(0, PAGE_SIZE).map((album) => tile(album, { heading: 'h2' })));
  html = html.replace(GRID, (_, open) => `${open}${tiles.join('')}`);
  html = html.replace(/(<dt>Stories<\/dt><dd>)\d+(<\/dd>)/, `$1${albums.length}$2`);
  return html;
}

const NEXT_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h13m-6-6 6 6-6 6"></path></svg>';
const PREV_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H6m6-6-6 6 6 6"></path></svg>';

function pagination(label: string, base: string, page: number, pages: number): string {
  const href = (n: number) => (n === 1 ? `${base}/` : `${base}/${n}/`);
  const bare = (n: number) => (n === 1 ? base : `${base}/${n}`);
  const numbers = Array.from({ length: pages }, (_, i) => i + 1).map((n) => n === page
    ? `<span class="pagination-current" aria-current="page">${n}</span>`
    : `<a class="pagination-page" href="${href(n)}" aria-label="Page ${n}">${n}</a>`).join('');
  const prev = page > 1 ? `<a class="btn btn-outline btn-sm" href="${bare(page - 1)}" rel="prev">${PREV_ICON}<span>Previous</span></a>` : '';
  const next = page < pages ? `<a class="btn btn-outline btn-sm" href="${bare(page + 1)}" rel="next"><span>Next</span>${NEXT_ICON}</a>` : '';
  return `<nav class="pagination" aria-label="${escapeAttr(label)} pagination"><div class="pagination-side">${prev}</div><div class="pagination-pages">${numbers}</div><div class="pagination-side">${next}</div></nav>`;
}

async function archiveTransform(html: string, listing: Extract<Listing, { kind: 'archive' }>): Promise<string> {
  const albums = (await getAlbums()).filter(listing.filter);
  const pages = listing.paginated ? pageCount(albums.length, availablePages(listing.base)) : 1;
  const page = Math.min(listing.page, pages);
  const start = (page - 1) * PAGE_SIZE;
  const items = page === pages ? albums.slice(start) : albums.slice(start, start + PAGE_SIZE);
  const tiles = await Promise.all(items.map((album, index) => tile(album, { heading: 'h2', eager: index < 4, priority: index < 2 })));
  html = html.replace(GRID, (_, open) => `${open}${tiles.join('')}`);

  const noun = albums.length === 1 ? 'story' : 'stories';
  const count = pages > 1 ? `${albums.length} ${noun} · page ${page} of ${pages}` : `${albums.length} ${noun}`;
  html = html.replace(/(<div data-reveal="up"><p class="archive-count">)[^<]*(<\/p>)/, `$1${count}$2`);

  // Pagination: rebuilt (or removed) to match the real page count.
  const heading = html.match(/<h1 class="title-xl archive-title"[^>]*>([^<]*)<\/h1>/)?.[1] ?? listing.label;
  const label = html.match(/<nav class="pagination" aria-label="([^"]*) pagination">/)?.[1] ?? heading.replaceAll('&amp;', '&');
  const nav = listing.paginated && pages > 1 ? pagination(label, listing.base, page, pages) : '';
  if (/<nav class="pagination"[\s\S]*?<\/nav>/.test(html)) html = html.replace(/<nav class="pagination"[\s\S]*?<\/nav>/, nav);
  else if (nav) html = html.replace(/(<section class="wrap archive-feed">[\s\S]*?)(<\/section>)/, `$1${nav}$2`);
  return html;
}

/** Rewrites a reference page's HTML with editable content. */
export async function transform(route: string, html: string): Promise<string> {
  const listing = listingFor(route);
  if (!listing) return html;
  if (listing.kind === 'home') return homeTransform(html);
  return archiveTransform(html, listing);
}
