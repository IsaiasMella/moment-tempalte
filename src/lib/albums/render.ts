import GithubSlugger from 'github-slugger';
import fs from 'node:fs';
import path from 'node:path';
import type { AlbumEntry } from './data';
import { tagSlug } from './data';
import { imageInfo, srcset, WIDTHS, type ImageInfo } from './images';
import type { AlbumBlock, AlbumImage } from './schema';

/* ------------------------------------------------------------------ helpers */

export const escapeText = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export const escapeAttr = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

/** name="value", or a bare attribute for an empty value (as Astro renders it). */
const attr = (name: string, value: string | number | undefined) =>
  value === undefined ? '' : value === '' ? ` ${name}` : ` ${name}="${escapeAttr(String(value))}"`;

const longDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatLong = (date: Date) => longDate.format(date);
export const formatMonth = (date: Date) => monthYear.format(date);

/** Small inline Markdown: **bold**, *italic* / _italic_, [text](url), line breaks. */
export function inlineMarkdown(source: string): string {
  let html = escapeText(source);
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href);
    return `<a href="${escapeAttr(href.replaceAll('&amp;', '&'))}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${label}</a>`;
  });
  html = html.replace(/\*\*(\S(?:[\s\S]*?\S)?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*\w])\*(\S(?:[\s\S]*?\S)?)\*(?![*\w])/g, '$1<em>$2</em>');
  html = html.replace(/(^|[^_\w])_(\S(?:[\s\S]*?\S)?)_(?![_\w])/g, '$1<em>$2</em>');
  html = html.replace(/ {2,}\n|\\\n/g, '<br>\n');
  return html;
}

const paragraphs = (body: string) => body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  .map((part) => `<p>${inlineMarkdown(part)}</p>`);

/** `(max-aspect-ratio: …) …vh, 100vw` sizes used by full-bleed images. */
function bleedSizes(info: ImageInfo, factor: number): string {
  if (!info.width || !info.height) return '100vw';
  const vh = Number(((info.width * factor) / info.height).toFixed(2));
  return `(max-aspect-ratio: ${info.width * factor}/${info.height * 100}) ${vh}vh, 100vw`;
}

interface ImgOptions {
  alt: string;
  widths: readonly number[];
  sizes: string;
  eager?: boolean;
  /** fetchpriority="high" (defaults to true when eager). */
  priority?: boolean;
  autosize?: boolean;
}

function img(info: ImageInfo, options: ImgOptions): string {
  const set = srcset(info, options.widths);
  return `<img${attr('src', info.src)}${set ? attr('srcset', set) : ''}${attr('alt', options.alt)}${attr('sizes', options.sizes)}`
    + (options.eager ? ` loading="eager"${options.priority === false ? '' : ' fetchpriority="high"'}` : ' loading="lazy"')
    + ' decoding="async"'
    + (options.autosize ? ' data-autosize="true"' : '')
    + (info.width ? `${attr('width', info.width)}${attr('height', info.height)}` : '')
    + '>';
}

/* -------------------------------------------------------------------- tiles */

export async function tile(album: AlbumEntry, options: { heading: 'h2' | 'h3'; eager?: boolean; priority?: boolean }): Promise<string> {
  const info = await imageInfo(album.cover.src);
  const title = escapeText(album.title);
  const meta = `<div class="tile-meta meta-row"><span>${escapeText(album.categoryLabel)}</span><span>${formatMonth(album.date)}</span></div>`;
  return `<article class="tile" data-reveal="image"><a class="tile-link"${attr('href', album.url)}><div class="tile-media">`
    + img(info, { alt: album.cover.alt, widths: WIDTHS.tile, sizes: '(min-width: 88rem) 30vw, (min-width: 40rem) 46vw, 92vw', eager: options.eager, priority: options.priority ?? false, autosize: true })
    + `<div class="tile-overlay"><span class="tile-title-mask"><${options.heading} class="tile-title">${title}</${options.heading}></span>${meta}</div></div>`
    + `<div class="tile-caption"><span class="tile-caption-title">${title}</span>${meta}</div></a></article>`;
}

/* ------------------------------------------------------------------- blocks */

async function lightboxButton(image: AlbumImage, className: string, label: string): Promise<{ open: string; info: ImageInfo }> {
  const info = await imageInfo(image.src);
  const set = srcset(info, 'lightbox');
  const open = `<button class="${className}" type="button" data-lightbox data-lightbox-group="story"${attr('data-lightbox-src', info.src)}`
    + (set ? attr('data-lightbox-srcset', set) : '')
    + `${attr('data-lightbox-alt', image.alt)}${attr('data-lightbox-caption', image.caption ?? '')}${attr('data-lightbox-credit', image.credit ?? '')}`
    + `${attr('aria-label', image.alt ? `${label}: ${image.alt}` : label)}>`;
  return { open, info };
}

const FIGURE = {
  regular: { className: 'card', sizes: '(min-width: 48rem) 608px, 94vw', widths: WIDTHS.regular },
  wide: { className: 'card card-wide', sizes: '(min-width: 64rem) 1100px, 94vw', widths: WIDTHS.wide },
  full: { className: 'card card-full', sizes: '100vw', widths: WIDTHS.full },
} as const;

async function renderBlock(block: AlbumBlock, slugger: GithubSlugger): Promise<string> {
  switch (block.type) {
    case 'text':
      return paragraphs(block.body).join('\n');
    case 'heading':
      return `<h2 id="${escapeAttr(slugger.slug(block.text))}">${escapeText(block.text)}</h2>`;
    case 'quote': {
      const cite = block.author ? `<cite class="pullquote-attribution">${escapeText(block.author)}</cite>` : '';
      const parts = block.text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
      const body = parts.length > 1 ? parts.map((part) => `<p>${inlineMarkdown(part)}</p>`).join('') : inlineMarkdown(block.text);
      return `<blockquote class="pullquote${block.style === 'alt' ? ' pullquote-alt' : ''}">${body}${cite}</blockquote>`;
    }
    case 'image': {
      const variant = FIGURE[block.size];
      const { open, info } = await lightboxButton(block, 'figure-frame', 'Enlarge photograph');
      const caption = block.caption ? `<figcaption class="figure-caption">${escapeText(block.caption)}</figcaption>` : '';
      return `<figure class="${variant.className}">${open}${img(info, { alt: block.alt, widths: variant.widths, sizes: variant.sizes, autosize: true })}</button>${caption}</figure>`;
    }
    case 'gallery': {
      const frames = await Promise.all(block.images.map(async (image, index) => {
        const { open, info } = await lightboxButton(image, 'gallery-frame', `Enlarge photograph ${index + 1} of ${block.images.length}`);
        return `${open}${img(info, { alt: image.alt, widths: WIDTHS.gallery, sizes: '(min-width: 64rem) 34vw, (min-width: 40rem) 48vw, 94vw', autosize: true })}</button>`;
      }));
      const caption = block.caption ? `<figcaption class="gallery-caption">${escapeText(block.caption)}</figcaption>` : '';
      return `<figure class="gallery" aria-label="Gallery"><div class="gallery-rows" data-gallery>${frames.join('')}</div>${caption}</figure>`;
    }
  }
}

/* -------------------------------------------------------------- story shell */

/** The reference story used as the page shell (head, header, footer, scripts). */
export const SHELL_FILE = path.resolve('src/reference/story/elena-and-marc-cap-de-formentor/index.html');

interface Shell {
  html: string;
  url: string;
  title: string;
  galleryScript: string;
  masonryScript: string;
  shareActions: string;
  tail: string;
}

const between = (source: string, start: string, end: string, from = 0) => {
  const i = source.indexOf(start, from);
  if (i < 0) return '';
  const j = source.indexOf(end, i + start.length);
  return j < 0 ? '' : source.slice(i, j + end.length);
};

/** Picks apart a rendered shell page (after renderReference). */
export function parseShell(html: string): Shell {
  const url = html.match(/<link rel="canonical" href="([^"]*)">/)![1];
  const title = html.match(/data-share-title="([^"]*)"/)![1].replaceAll('&amp;', '&');
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const galleryAt = main.indexOf('<figure class="gallery"');
  let galleryScript = galleryAt >= 0 ? between(main, '<script type="module">', '</script>', galleryAt) : '';
  if (!galleryScript) {
    const guide = fs.readFileSync(path.resolve('src/reference/styleguide/index.html'), 'utf8');
    galleryScript = between(guide, '<script type="module">', '</script>', guide.indexOf('<figure class="gallery"'));
  }
  const related = main.indexOf('<section class="wrap section" aria-labelledby="more-work">');
  const masonryScript = between(main, '<script type="module">', '</script>', related);
  const shareActions = between(main, '<div class="post-footer-actions">', '</script></div>');
  const tail = main.slice(main.indexOf('<dialog id="share-sheet"'));
  return { html, url, title, galleryScript, masonryScript, shareActions, tail };
}

function replaceShareTargets(source: string, shell: Shell, url: string, title: string) {
  return source
    .replaceAll(encodeURIComponent(shell.url), encodeURIComponent(url))
    .replaceAll(encodeURIComponent(shell.title), encodeURIComponent(title))
    .replaceAll(shell.url, url);
}

async function storyMain(album: AlbumEntry, albums: AlbumEntry[], shell: Shell, url: string): Promise<string> {
  const cover = await imageInfo(album.cover.src);
  const title = escapeText(album.title);
  const kicker = [album.categoryLabel, album.location, formatLong(album.date)].filter(Boolean)
    .map((part) => `<span>${escapeText(part)}</span>`).join('');

  let header: string;
  if (album.layout === 'note') {
    const orientation = cover.width && cover.height && cover.height > cover.width ? 'media-portrait' : 'media-landscape';
    header = `<header class="wrap wrap-mid post-head"><p class="label label-soft meta-row post-kicker">${kicker}</p><h1 class="display post-head-title">${title}</h1><p class="lede page-head-lede">${escapeText(album.lede)}</p></header>`
      + `<div class="wrap"><figure class="post-figure-inline" data-reveal="image"><div class="media ${orientation}">`
      + img(cover, { alt: album.cover.alt, widths: WIDTHS.hero, sizes: '100vw', eager: true })
      + '</div></figure></div>';
  } else {
    header = '<header class="post-hero"><div class="post-hero-media">'
      + img(cover, { alt: album.cover.alt, widths: WIDTHS.hero, sizes: bleedSizes(cover, 92), eager: true })
      + `</div><div class="post-hero-scrim"></div><div class="wrap post-hero-body"><p class="label meta-row post-kicker">${kicker}</p><h1 class="display post-hero-title">${title}</h1></div></header>`
      + `<div class="wrap wrap-reading"><p class="post-lede" data-reveal="up">${escapeText(album.lede)}</p></div>`;
  }

  const slugger = new GithubSlugger();
  const blocks: string[] = [];
  let galleryScriptUsed = false;
  for (const block of album.blocks) {
    let html = await renderBlock(block, slugger);
    if (block.type === 'gallery' && !galleryScriptUsed) {
      html += shell.galleryScript;
      galleryScriptUsed = true;
    }
    blocks.push(html);
  }

  const tagLinks = album.tags.map((tag) => {
    const slug = tagSlug(tag);
    return fs.existsSync(path.resolve('src/reference/tag', slug, 'index.html'))
      ? `<a class="pill" href="/tag/${slug}/">${escapeText(tag)}</a>`
      : `<span class="pill">${escapeText(tag)}</span>`;
  });
  const pills = [`<a class="pill" href="/collection/${album.category}/">${escapeText(album.categoryLabel)}</a>`, ...tagLinks].join('');
  const actions = shell.shareActions
    .replace(/data-share-title="[^"]*"/, `data-share-title="${escapeAttr(album.title)}"`)
    .replace(/data-share-url="[^"]*"/, `data-share-url="${escapeAttr(url)}"`);

  let out = `<main id="content" class="main"><article>${header}<div class="wrap"><div class="prose">${blocks.join('\n')}</div></div>`
    + `<div class="wrap wrap-mid"><div class="post-footer"><div class="post-footer-tags">${pills}</div>${actions}</div></div></article>`;

  const related = albums.filter((other) => other.category === album.category && other.slug !== album.slug).slice(0, 3);
  if (related.length) {
    const tiles = await Promise.all(related.map((other) => tile(other, { heading: 'h3' })));
    out += '<section class="wrap section" aria-labelledby="more-work"><div class="post-related-head">'
      + `<h2 class="title-lg" id="more-work" data-reveal="up">More ${escapeText(album.categoryLabel.toLowerCase())}</h2>`
      + `<a class="arrow-link" href="/collection/${album.category}/"><span>See all</span></a></div>`
      + `<div class="grid grid-3 grid-masonry" data-masonry data-reveal-group="40">${tiles.join('')}</div>${shell.masonryScript}</section>`;
  }

  const index = albums.findIndex((other) => other.slug === album.slug);
  const next = albums.length > 1 ? albums[(index + 1) % albums.length] : undefined;
  if (next) {
    const nextCover = await imageInfo(next.cover.src);
    out += `<a class="post-next"${attr('href', next.url)}><div class="post-next-media">`
      + img(nextCover, { alt: '', widths: WIDTHS.next, sizes: bleedSizes(nextCover, 70) })
      + `</div><div class="post-next-scrim"></div><div class="post-next-body"><p class="label">Next</p><p class="title-xl post-next-title">${escapeText(next.title)}</p></div></a>`;
  }

  return `${out}${replaceShareTargets(shell.tail, shell, url, album.title)}</main>`;
}

function storyHead(head: string, album: AlbumEntry, url: string, origin: string, cover: ImageInfo): string {
  const description = album.description ?? album.lede;
  const og = cover.og ?? cover.src;
  const ogAbsolute = /^https?:/.test(og) ? og : `${origin}${og}`;
  const iso = album.date.toISOString();
  const modified = (album.updated ?? album.date).toISOString();
  const setMeta = (source: string, key: string, value: string) =>
    source.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*(">)`), (_, a, b) => `${a}${escapeAttr(value)}${b}`);

  let out = head.replace(/<title>[\s\S]*?( \| [^<]*)<\/title>/, (_, suffix) => `<title>${escapeText(album.title)}${suffix}</title>`);
  const siteSuffix = head.match(/<title>[\s\S]*?( \| [^<]*)<\/title>/)?.[1].replaceAll('&amp;', '&') ?? '';
  const fullTitle = `${album.title}${siteSuffix}`;
  out = out.replace(/(<link rel="canonical" href=")[^"]*(">)/, `$1${escapeAttr(url)}$2`);
  for (const [key, value] of [
    ['description', description], ['og:title', fullTitle], ['og:description', description], ['og:url', url],
    ['og:image', ogAbsolute], ['og:image:alt', album.cover.alt],
    ['article:published_time', iso], ['article:modified_time', modified], ['article:section', album.categoryLabel],
    ['twitter:title', fullTitle], ['twitter:description', description], ['twitter:image', ogAbsolute], ['twitter:image:alt', album.cover.alt],
  ] as const) out = setMeta(out, key, value);
  out = out.replace(/<meta property="article:tag" content="[^"]*">/g, '');
  out = out.replace(/(<meta property="article:section" content="[^"]*">)/,
    `$1${album.tags.map((tag) => `<meta property="article:tag"${attr('content', tag)}>`).join('')}`);

  out = out.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (_, json) => {
    let data: any[];
    try { data = JSON.parse(json); } catch { return _; }
    const [article, crumbs] = Array.isArray(data) ? data : [data];
    const next: Record<string, unknown> = {
      '@context': article['@context'], '@type': article['@type'],
      headline: album.title, description, image: ogAbsolute, url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      datePublished: iso, dateModified: modified,
      author: article.author, publisher: article.publisher,
      articleSection: album.categoryLabel, keywords: album.tags,
      inLanguage: article.inLanguage, isAccessibleForFree: article.isAccessibleForFree,
    };
    if (album.location) next.contentLocation = { '@type': 'Place', name: album.location };
    const out = [next];
    if (crumbs?.itemListElement) {
      const [home] = crumbs.itemListElement;
      out.push({ ...crumbs, itemListElement: [
        home,
        { '@type': 'ListItem', position: 2, name: album.categoryLabel, item: `${origin}/collection/${album.category}/` },
        { '@type': 'ListItem', position: 3, name: album.title, item: url },
      ] } as any);
    }
    return `<script type="application/ld+json">${JSON.stringify(out).replaceAll('</', '<\\/')}</script>`;
  });
  return out;
}

/** Full story page: the shell with its head metadata and <main> rebuilt from the album. */
export async function renderStory(shellHtml: string, album: AlbumEntry, albums: AlbumEntry[], origin: string): Promise<string> {
  const shell = parseShell(shellHtml);
  const base = origin.replace(/\/$/, '');
  const url = `${base}${album.url}`;
  const headEnd = shellHtml.indexOf('</head>');
  const mainStart = shellHtml.indexOf('<main');
  const mainEnd = shellHtml.indexOf('</main>') + '</main>'.length;
  const cover = await imageInfo(album.cover.src);
  let header = shellHtml.slice(headEnd, mainStart);
  // The transparent header only sits over a full-bleed hero.
  if (album.layout === 'note') header = header.replace(' site-header-slot--over', '').replace(' site-header--over', '');
  return storyHead(shellHtml.slice(0, headEnd), album, url, base, cover)
    + header
    + await storyMain(album, albums, shell, url)
    + shellHtml.slice(mainEnd);
}
