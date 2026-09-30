/** Small, dependency-free HTML helpers for rewriting the reference markup. */

import { esc, escAttr } from '../markdown';

export { esc, escAttr, markdown } from '../markdown';

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
