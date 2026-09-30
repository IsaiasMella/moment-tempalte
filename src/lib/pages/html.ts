/** Small, dependency-free HTML helpers for rewriting the reference markup. */

export const esc = (value: string): string =>
  String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export const escAttr = (value: string): string => esc(value).replaceAll('"', '&quot;');

export const escRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replaces the first match of `pattern` using `fn`. When the markup is not found
 * (the reference layout changed) the page is returned untouched and a warning is logged,
 * so a layout drift never breaks the build.
 */
export function replaceOnce(html: string, pattern: RegExp, fn: (...match: string[]) => string, label: string): string {
  let found = false;
  const result = html.replace(pattern, (...args) => {
    found = true;
    return fn(...(args.slice(0, -2) as string[]));
  });
  if (!found) console.warn(`[pages] ${label}: markup not found, left unchanged`);
  return result;
}

/** Same as replaceOnce but for every match; silent when nothing matches. */
export function replaceAll(html: string, pattern: RegExp, fn: (...match: string[]) => string): string {
  return html.replace(pattern, (...args) => fn(...(args.slice(0, -2) as string[])));
}

export function getAttr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? match[1] : '';
}

export function setAttr(tag: string, name: string, value: string): string {
  const pattern = new RegExp(`(\\s${name}=")[^"]*(")`);
  if (pattern.test(tag)) return tag.replace(pattern, (_, a, b) => `${a}${escAttr(value)}${b}`);
  return tag.replace(/^<(\w+)/, `<$1 ${name}="${escAttr(value)}"`);
}

export function removeAttr(tag: string, name: string): string {
  return tag.replace(new RegExp(`\\s${name}(="[^"]*")?(?=[\\s>])`), '');
}

const decodeEntities = (value: string) => value.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

/**
 * Renders an <img> from a reference tag. If `src` is the tag's original image, the tag
 * (with its responsive srcset) is kept and only the alt text updated; otherwise the new
 * image replaces it and srcset/sizes are dropped so the browser loads the new file.
 * `candidates` lets list items reuse the responsive tag of whichever reference image they point to.
 */
export function renderImg(template: string, src: string, alt: string, candidates: string[] = []): string {
  const pool = [template, ...candidates];
  const original = pool.find(tag => decodeEntities(getAttr(tag, 'src')) === src);
  if (original) return setAttr(original, 'alt', alt);
  let tag = setAttr(template, 'src', src);
  tag = removeAttr(tag, 'srcset');
  tag = removeAttr(tag, 'sizes');
  return setAttr(tag, 'alt', alt);
}

/** Splits plain text into paragraphs on blank lines. */
export const paragraphs = (value: string): string[] =>
  String(value ?? '').split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);

/** Plain-text with single newlines rendered as <br>. */
export const textWithBreaks = (value: string): string => esc(value.trim()).replace(/\n/g, '<br>');

// ---------------------------------------------------------------------------------------------
// Minimal Markdown renderer (headings, paragraphs, lists, blockquotes, links, emphasis, code).
// Output is compact HTML matching the reference prose (e.g. `<h2>..</h2><p>..</p>`).

function emphasis(text: string): string {
  return text
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?![\w])/g, '$1<strong>$2</strong>')
    .replace(/\*(?=\S)([\s\S]*?\S)\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?![\w])/g, '$1<em>$2</em>');
}

function inline(source: string): string {
  // Code spans, images and links are stashed so emphasis never touches their URLs.
  const stash: string[] = [];
  const keep = (html: string) => `\u0000${stash.push(html) - 1}\u0000`;
  let text = source.replace(/`([^`]+)`/g, (_, code) => keep(`<code>${esc(code)}</code>`));
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) =>
    keep(`<img src="${escAttr(src)}" alt="${escAttr(alt)}" loading="lazy" decoding="async">`));
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href);
    return keep(`<a href="${escAttr(href)}"${external ? ' rel="noopener"' : ''}>${emphasis(esc(label))}</a>`);
  });
  text = emphasis(esc(text));
  text = text.replace(/ {2,}\n/g, '<br>').replace(/\\\n/g, '<br>');
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);
}

export function markdown(source: string, vars: Record<string, string> = {}): string {
  let text = String(source ?? '').replace(/\r\n?/g, '\n');
  for (const [key, value] of Object.entries(vars)) text = text.replaceAll(`{${key}}`, value);
  const blocks = text.split(/\n\s*\n/).map(block => block.replace(/^\n+|\s+$/g, '')).filter(Boolean);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const heading = block.match(/^(#{1,6})\s+([\s\S]*?)\s*#*$/);
    if (heading && lines.length === 1) {
      out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
    } else if (lines.every(line => /^\s*[-*+]\s+/.test(line) || /^\s{2,}\S/.test(line))) {
      out.push(`<ul>${list(lines, /^\s*[-*+]\s+/)}</ul>`);
    } else if (lines.every(line => /^\s*\d+[.)]\s+/.test(line) || /^\s{2,}\S/.test(line))) {
      out.push(`<ol>${list(lines, /^\s*\d+[.)]\s+/)}</ol>`);
    } else if (lines.every(line => /^>/.test(line))) {
      out.push(`<blockquote>${markdown(lines.map(line => line.replace(/^>\s?/, '')).join('\n'))}</blockquote>`);
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(block.trim())) {
      out.push('<hr>');
    } else {
      out.push(`<p>${inline(block)}</p>`);
    }
  }
  return out.join('');
}

function list(lines: string[], marker: RegExp): string {
  const items: string[] = [];
  for (const line of lines) {
    if (marker.test(line)) items.push(line.replace(marker, ''));
    else items[items.length - 1] += `\n${line.trim()}`;
  }
  return items.map(item => `<li>${inline(item)}</li>`).join('');
}
