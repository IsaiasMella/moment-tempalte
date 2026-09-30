/**
 * Minimal, dependency-free Markdown renderer for CMS text fields (headings,
 * paragraphs, lists, blockquotes, links, emphasis, code). Output is compact HTML
 * matching the theme's prose markup (e.g. `<h2>..</h2><p>..</p>`).
 *
 * Used with `<Fragment set:html={markdown(body)} />`, the Astro equivalent of
 * React's `dangerouslySetInnerHTML`. Text is escaped, so CMS input cannot inject HTML.
 */

/** Escapes text for use inside HTML. */
export const esc = (value: string): string =>
  String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Escapes text for use inside a double-quoted HTML attribute. */
export const escAttr = (value: string): string => esc(value).replaceAll('"', '&quot;');


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

/**
 * Renders Markdown to HTML. `{key}` placeholders are replaced from `vars` first
 * (e.g. `{email}` in the privacy page body).
 */
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
