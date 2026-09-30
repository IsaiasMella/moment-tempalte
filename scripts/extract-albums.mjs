#!/usr/bin/env node
/**
 * One-off extraction: turns the compiled story pages in src/reference/story/<slug>/index.html
 * into editable content files at src/content/albums/<slug>.md (YAML front matter only).
 *
 *   node scripts/extract-albums.mjs          # writes missing files only
 *   node scripts/extract-albums.mjs --force  # overwrites existing files
 *
 * The generated shape is documented in src/lib/albums/schema.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const force = process.argv.includes('--force');
const referenceDir = path.resolve('src/reference/story');
const outDir = path.resolve('src/content/albums');
fs.mkdirSync(outDir, { recursive: true });

const FEATURED = new Set(['elena-and-marc-cap-de-formentor', 'sofia-and-james-a-january-elopement', 'amara-and-theo-the-long-table']);

const decode = (value = '') => value
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&nbsp;', ' ')
  .replaceAll('&amp;', '&');
const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}(?:="([^"]*)")?(?=[\\s>])`));
  return match ? decode(match[1] ?? '') : undefined;
};
const text = (html) => decode(html.replace(/<[^>]+>/g, ''));

/** Splits the prose into its top-level elements. */
function topLevel(html) {
  const out = [];
  const open = /<(p|h2|figure|blockquote|script)\b[^>]*>/g;
  let match;
  while ((match = open.exec(html))) {
    const tag = match[1];
    const close = `</${tag}>`;
    const end = html.indexOf(close, match.index) + close.length;
    out.push({ tag, html: html.slice(match.index, end), open: match[0] });
    open.lastIndex = end;
  }
  return out;
}

function frameImage(button) {
  const img = button.match(/<img\b[^>]*>/)[0];
  const item = { src: attr(img, 'src'), alt: attr(img, 'alt') ?? '' };
  const caption = attr(button, 'data-lightbox-caption');
  const credit = attr(button, 'data-lightbox-credit');
  if (caption) item.caption = caption;
  if (credit) item.credit = credit;
  return item;
}

function extract(slug, html) {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const head = html.slice(0, html.indexOf('</head>'));
  const layout = main.includes('class="post-hero-media"') ? 'story' : 'note';
  const coverImg = main.slice(0, main.indexOf('<div class="prose">')).match(/<img\b[^>]*>/)[0];
  const kicker = main.match(/<p class="label[^"]*post-kicker">(.*?)<\/p>/)[1];
  const [category, location] = [...kicker.matchAll(/<span>(.*?)<\/span>/g)].map((m) => text(m[1]));
  const title = text(main.match(/<h1 class="display [^"]*">(.*?)<\/h1>/)[1]);
  const lede = text(main.match(/<p class="(?:post-lede|lede page-head-lede)"[^>]*>(.*?)<\/p>/)[1]);
  const description = attr(head.match(/<meta name="description"[^>]*>/)[0], 'content');
  const published = attr(head.match(/<meta property="article:published_time"[^>]*>/)[0], 'content');
  const modified = attr(head.match(/<meta property="article:modified_time"[^>]*>/)[0], 'content');
  const tags = [...head.matchAll(/<meta property="article:tag" content="([^"]*)">/g)].map((m) => decode(m[1]));

  const proseStart = main.indexOf('<div class="prose">') + '<div class="prose">'.length;
  const prose = main.slice(proseStart, main.indexOf('</div></div><div class="wrap wrap-mid">', proseStart));
  const blocks = [];
  for (const node of topLevel(prose)) {
    if (node.tag === 'script') continue;
    if (node.tag === 'p') {
      const paragraph = text(node.html);
      const last = blocks.at(-1);
      if (last?.type === 'text') last.body += `\n\n${paragraph}`;
      else blocks.push({ type: 'text', body: paragraph });
    } else if (node.tag === 'h2') {
      blocks.push({ type: 'heading', text: text(node.html) });
    } else if (node.tag === 'blockquote') {
      const cite = node.html.match(/<cite[^>]*>(.*?)<\/cite>/);
      const quote = { type: 'quote', text: text(node.html.replace(/<cite[\s\S]*<\/cite>/, '')) };
      if (cite) quote.author = text(cite[1]);
      if (node.open.includes('pullquote-alt')) quote.style = 'alt';
      blocks.push(quote);
    } else if (node.open.includes('class="gallery"')) {
      const images = [...node.html.matchAll(/<button class="gallery-frame"[\s\S]*?<\/button>/g)].map((m) => frameImage(m[0]));
      const caption = node.html.match(/<figcaption class="gallery-caption">(.*?)<\/figcaption>/);
      blocks.push({ type: 'gallery', ...(caption ? { caption: text(caption[1]) } : {}), images });
    } else if (node.open.startsWith('<figure class="card')) {
      const size = node.open.includes('card-wide') ? 'wide' : node.open.includes('card-full') ? 'full' : 'regular';
      blocks.push({ type: 'image', ...frameImage(node.html), size });
    } else {
      throw new Error(`${slug}: unsupported prose element ${node.open}`);
    }
  }

  const data = {
    title,
    date: published.slice(0, 10),
    ...(modified !== published ? { updated: modified.slice(0, 10) } : {}),
    category: category.toLowerCase(),
    location,
    layout,
    featured: FEATURED.has(slug),
    draft: false,
    tags,
    cover: { src: attr(coverImg, 'src'), alt: attr(coverImg, 'alt') ?? '' },
    lede,
    ...(description && description !== lede ? { description } : {}),
    blocks,
  };
  return data;
}

let written = 0;
for (const slug of fs.readdirSync(referenceDir).sort()) {
  const file = path.join(referenceDir, slug, 'index.html');
  if (!fs.existsSync(file)) continue;
  const target = path.join(outDir, `${slug}.md`);
  if (fs.existsSync(target) && !force) continue;
  const data = extract(slug, fs.readFileSync(file, 'utf8'));
  const front = yaml.dump(data, { lineWidth: -1, noRefs: true, quotingType: '"' })
    // Keep the date unquoted so it reads as a YAML date, like the CMS writes it.
    .replace(/^(date|updated): ["'](\d{4}-\d{2}-\d{2})["']$/gm, '$1: $2');
  fs.writeFileSync(target, `---\n${front}---\n`);
  written++;
}
console.log(`extract-albums: wrote ${written} file(s) to ${path.relative(process.cwd(), outDir)}`);
