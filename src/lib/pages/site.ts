import type { SiteSettings } from './schema';
import { socialIcons } from './icons';
import { esc, escAttr, escRegex, replaceAll, replaceOnce } from './html';

/** Values baked into the reference HTML, used to recognise what the settings replace. */
const REFERENCE = {
  name: 'Moments',
  photographer: 'Andrei Alba',
  ogImage: '/og-image.jpg',
  ogImageAlt: 'Moments — Wedding and portrait photography, quietly observed',
};

/** Marks the link of the current section (e.g. /work/ on /work/2/), like the reference layout. */
const current = (href: string, path: string) =>
  href === path || (href.length > 1 && href.endsWith('/') && path.startsWith(href)) ? ' aria-current="page"' : '';

function navItems(links: SiteSettings['nav']['primary'], path: string | null): string {
  return links
    .filter(link => link.label || link.href)
    .map(link => `<li><a href="${escAttr(link.href)}"${path === null ? '' : current(link.href, path)}>${esc(link.label)}</a></li>`)
    .join('');
}

export function socialHref(social: SiteSettings['socials'][number], settings: SiteSettings): string {
  if (social.url) return social.url;
  if (social.platform === 'email') return `mailto:${settings.email}`;
  if (social.platform === 'phone') return `tel:${settings.phone.replace(/[^\d+]/g, '')}`;
  return '#';
}

const socialLabel = (social: SiteSettings['socials'][number]) =>
  social.label || social.platform.charAt(0).toUpperCase() + social.platform.slice(1);

/** Rewrites every run of social icon links (drawer, footer, contact page) from settings. */
function socials(html: string, settings: SiteSettings): string {
  const run = /(?:<a class="icon-btn" href="[^"]*" rel="me noopener" aria-label="[^"]*"(?: data-astro-cid-\w+)?><span class="[^"]*" aria-hidden="true"><svg[\s\S]*?<\/svg><\/span><\/a>)+/g;
  return replaceAll(html, run, block => {
    const cid = block.match(/^<a [^>]*?( data-astro-cid-\w+)?>/)?.[1] ?? '';
    const spanClass = block.match(/<span class="([^"]*)" aria-hidden="true">/)?.[1] ?? '';
    return settings.socials
      .map(social => `<a class="icon-btn" href="${escAttr(socialHref(social, settings))}" rel="me noopener" aria-label="${escAttr(socialLabel(social))}"${cid}><span class="${spanClass}" aria-hidden="true">${socialIcons[social.platform] ?? socialIcons.website}</span></a>`)
      .join('');
  });
}

const absolute = (value: string, origin: string) => (/^https?:\/\//.test(value) ? value : `${origin}${value.startsWith('/') ? '' : '/'}${value}`);

type JsonNode = Record<string, unknown>;

/** Updates the studio/website entities in JSON-LD blocks. */
function jsonLd(html: string, settings: SiteSettings, crumb?: { url: string; name: string }): string {
  const sameAs = settings.socials
    .filter(social => !['email', 'phone'].includes(social.platform))
    .map(social => socialHref(social, settings))
    .filter(url => /^https?:\/\//.test(url));
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    const item = node as JsonNode;
    const id = typeof item['@id'] === 'string' ? item['@id'] : '';
    if (item['@type'] === 'WebSite') {
      item.name = settings.name;
      item.alternateName = settings.tagline;
      item.description = settings.seo.description;
    }
    if (id.endsWith('#studio')) {
      item.name = settings.name;
      item.description = settings.seo.description;
      if (item.founder && typeof item.founder === 'object') (item.founder as JsonNode).name = settings.photographer;
      const logo = item.logo as JsonNode | undefined;
      if (logo && typeof logo.url === 'string' && logo.url.endsWith(REFERENCE.ogImage) && settings.seo.ogImage) {
        logo.url = absolute(settings.seo.ogImage, logo.url.slice(0, -REFERENCE.ogImage.length));
      }
      item.sameAs = sameAs;
    }
    if (item['@type'] === 'Person' && item.name === REFERENCE.photographer) item.name = settings.photographer;
    if (item['@type'] === 'BreadcrumbList' && Array.isArray(item.itemListElement)) {
      const list = item.itemListElement as JsonNode[];
      if (list[0]?.position === 1) list[0].name = settings.name;
      const last = list[list.length - 1];
      if (crumb && list.length > 1 && typeof last?.item === 'string' && last.item.endsWith(crumb.url)) last.name = crumb.name;
    }
    for (const [key, value] of Object.entries(item)) if (key !== 'sameAs') visit(value);
  };
  return replaceAll(html, /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (_, open, source, close) => {
    let data: unknown;
    try {
      data = JSON.parse(source);
    } catch {
      return `${open}${source}${close}`;
    }
    visit(data);
    return `${open}${JSON.stringify(data).replace(/</g, '\\u003c')}${close}`;
  });
}

/** Keeps the reference behaviour of src/lib/reference.ts, but reading the endpoints from settings. */
function formAction(html: string, className: string, action: string): string {
  if (!action) return html;
  const pattern = new RegExp(`<form\\b[^>]*class="[^"]*${className}[^"]*"[^>]*>[\\s\\S]*?<\\/form>`, 'g');
  return replaceAll(html, pattern, form => {
    if (/^<form\b[^>]*\saction=/.test(form)) return form;
    return form
      .replace('<form ', `<form action="${escAttr(action)}" `)
      .replace(/ disabled(?=[\s>])/g, '')
      .replace(/<p[^>]*class="[^"]*form-note[^"]*"[^>]*>[\s\S]*?<\/p>/g, '');
  });
}

function footer(html: string, settings: SiteSettings): string {
  const f = settings.footer;
  return replaceOnce(html, /<footer class="site-footer[\s\S]*?<\/footer>/, block => {
    block = replaceOnce(block, /(<h2 class="title-lg site-footer-signup-title">)[\s\S]*?(<\/h2>)/, (_, a, b) => `${a}${esc(f.signupTitle)}${b}`, 'footer signup title');
    block = replaceOnce(block, /(<div class="site-footer-signup"><div><h2[\s\S]*?<\/h2>)<p class="lede"([^>]*)>[\s\S]*?<\/p>/, (_, a, attrs) =>
      f.signupText ? `${a}<p class="lede"${attrs}>${esc(f.signupText)}</p>` : a, 'footer signup text');
    block = replaceOnce(block, /(<input id="footer-signup"[^>]*placeholder=")[^"]*"/, (_, a) => `${a}${escAttr(f.signupPlaceholder)}"`, 'footer signup placeholder');
    block = replaceOnce(block, /(<form class="subscribe-form"[\s\S]*?<button type="submit"[^>]*><span>)[\s\S]*?(<\/span>)/, (_, a, b) => `${a}${esc(f.signupButton)}${b}`, 'footer signup button');
    block = replaceOnce(block, /(<p class="site-footer-description">)[\s\S]*?(<\/p>)/, (_, a, b) => `${a}${esc(f.description)}${b}`, 'footer description');
    block = replaceOnce(block, /(?:<nav class="site-footer-nav"[\s\S]*?<\/nav>)+/, () =>
      f.columns.map(column => `<nav class="site-footer-nav" aria-label="${escAttr(column.heading)}"><p class="site-footer-heading">${esc(column.heading)}</p><ul>${navItems(column.links, null)}</ul></nav>`).join(''),
    'footer columns');
    block = replaceOnce(block, /(<p class="site-footer-credits"><span>)[\s\S]*?(<\/span><\/p>)(?:<p>[\s\S]*?<\/p>)?/, (_, a, b) =>
      `${a}${esc(f.copyright).replaceAll('©', '&copy;')}${b}${f.credit ? `<p>${esc(f.credit)}</p>` : ''}`, 'footer credits');
    return block;
  }, 'footer');
}

function head(html: string, settings: SiteSettings): string {
  const name = settings.name;
  const ref = escRegex(escAttr(REFERENCE.name));
  html = html.replace(/<head>[\s\S]*?<\/head>/, headHtml => {
    headHtml = headHtml.replace(new RegExp(`(<title>[^<]*?)( \\| )${ref}(</title>)`), (_, a, b, c) => `${a}${b}${esc(name)}${c}`);
    headHtml = headHtml.replace(new RegExp(`(<meta (?:property="og:title"|name="twitter:title") content="[^"]*?)( \\| )${ref}"`, 'g'), (_, a, b) => `${a}${b}${escAttr(name)}"`);
    headHtml = headHtml.replace(/(<meta property="og:site_name" content=")[^"]*"/, (_, a) => `${a}${escAttr(name)}"`);
    if (settings.seo.ogImage) {
      headHtml = headHtml.replace(new RegExp(`(<meta (?:property="og:image"|name="twitter:image") content=")([^"]*?)${escRegex(REFERENCE.ogImage)}"`, 'g'),
        (_, a, origin) => `${a}${escAttr(absolute(settings.seo.ogImage, origin))}"`);
    }
    headHtml = headHtml.replace(new RegExp(`(<meta (?:property="og:image:alt"|name="twitter:image:alt") content=")${escRegex(escAttr(REFERENCE.ogImageAlt))}"`, 'g'),
      (_, a) => `${a}${escAttr(settings.seo.ogImageAlt)}"`);
    return headHtml;
  });
  return html;
}

/** Applies the global site settings (header, drawer, footer, socials, SEO defaults, forms). */
export function applySiteSettings(route: string, html: string, settings: SiteSettings, crumb?: { url: string; name: string }): string {
  const path = `/${route}`;
  html = head(html, settings);
  html = jsonLd(html, settings, crumb);

  // Brand (wordmark links in header, drawer and footer).
  html = html.replace(/(<a class="wordmark-link" href="\/" aria-label=")[^"]*"/, (_, a) => `${a}${escAttr(`${settings.name} home`)}"`);
  html = replaceAll(html, /(<a class="wordmark-link"[^>]*><span class="wordmark[^"]*">)([\s\S]*?)(<\/span><span class="sr-only">)[^<]*(<\/span><\/a>)/g, (_, a, mark, b, c) => {
    const logo = settings.logo ? `<img src="${escAttr(settings.logo)}" alt="" style="width:auto;height:100%;display:block">` : mark;
    return `${a}${logo}${b}${esc(settings.name)}${c}`;
  });

  // Navigation.
  html = replaceOnce(html, /(<nav class="site-header-nav"[^>]*><ul>)[\s\S]*?(<\/ul><\/nav>)/, (_, a, b) => `${a}${navItems(settings.nav.primary, path)}${b}`, 'header nav');
  html = replaceOnce(html, /(<ul class="menu-list menu-list-primary">)[\s\S]*?(<\/ul>)/, (_, a, b) => `${a}${navItems(settings.nav.primary, path)}${b}`, 'drawer nav');
  html = replaceOnce(html, /<p class="menu-group">[\s\S]*?<\/p><ul class="menu-list menu-list-secondary">[\s\S]*?<\/ul>/, () =>
    settings.nav.secondary.length
      ? `<p class="menu-group">${esc(settings.nav.secondaryHeading)}</p><ul class="menu-list menu-list-secondary">${navItems(settings.nav.secondary, path)}</ul>`
      : '',
  'drawer secondary nav');

  html = socials(html, settings);
  html = footer(html, settings);
  html = formAction(html, 'subscribe-form', settings.forms.newsletterAction);
  html = formAction(html, 'contact-form', settings.forms.enquiryAction);
  return html;
}
