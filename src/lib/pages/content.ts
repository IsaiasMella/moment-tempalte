import type { ContactPage, HomePage, PricingPage, PrivacyPage, SiteSettings, StudioPage } from './schema';
import { albumSummariesSync } from '../albums/data';
import { esc, escAttr, markdown, paragraphs, renderImg, replaceOnce } from './html';

const cidOf = (html: string) => html.match(/ data-astro-cid-\w+/)?.[0] ?? '';

/** <title>, description and social titles for a page. */
export function setHead(html: string, title: string, description: string): string {
  return html.replace(/<head>[\s\S]*?<\/head>/, head => {
    if (title) {
      head = head.replace(/(<title>)[\s\S]*?(<\/title>)/, (_, a, b) => `${a}${esc(title)}${b}`);
      head = head.replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*"/g, (_, a) => `${a}${escAttr(title)}"`);
    }
    if (description) {
      head = head.replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*"/g, (_, a) => `${a}${escAttr(description)}"`);
    }
    return head;
  });
}

/** Page header shared by studio, pricing, contact and privacy. */
function pageHead(html: string, title: string, lede: string): string {
  html = replaceOnce(html, /(<h1 class="display page-head-title"[^>]*>)[\s\S]*?(<\/h1>)/, (_, a, b) => `${a}${esc(title)}${b}`, 'page title');
  return replaceOnce(html, /(<p class="lede page-head-lede"[^>]*>)[\s\S]*?(<\/p>)/, (_, a, b) => (lede ? `${a}${esc(lede)}${b}` : ''), 'page lede');
}

const button = (className: string, href: string, label: string, extra = '', cid = '') =>
  label ? `<a class="${className}" href="${escAttr(href)}"${cid}${extra}><span${cid}>${esc(label)}</span></a>` : '';

// ---------------------------------------------------------------------------------------------- home

export function home(html: string, data: HomePage): string {
  html = replaceOnce(html, /(<main[^>]*><h1 class="sr-only">)[\s\S]*?(<\/h1>)/, (_, a, b) => `${a}${esc(data.heading)}${b}`, 'home heading');

  // Studio teaser.
  html = replaceOnce(html, /<section class="home-studio">[\s\S]*?<\/section>/, section => {
    const s = data.studio;
    section = replaceOnce(section, /<img [^>]*>/, img => renderImg(img, s.image, s.imageAlt), 'home studio image');
    section = replaceOnce(section, /(<h2 class="title-xl"[^>]*>)[\s\S]*?(<\/h2>)/, (_, a, b) => `${a}${esc(s.title)}${b}`, 'home studio title');
    section = replaceOnce(section, /(<p class="home-studio-text"[^>]*>)[\s\S]*?(<\/p>)/, (_, a, b) => `${a}${esc(s.text)}${b}`, 'home studio text');
    section = replaceOnce(section, /<a class="(btn [^"]*)" href="[^"]*"([^>]*)><span>[\s\S]*?<\/span><\/a>/, (_, cls, attrs) => button(cls, s.buttonLink, s.buttonLabel, attrs), 'home studio button');
    section = replaceOnce(section, /<dl class="home-studio-figures"([^>]*)>[\s\S]*?<\/dl>/, (_, attrs) =>
      s.figures.length
        ? `<dl class="home-studio-figures"${attrs}>${s.figures.map(f => `<div class="home-studio-figure"><dt>${esc(f.label)}</dt><dd>${esc(f.value.replaceAll('{stories}', String(albumSummariesSync().length)))}</dd></div>`).join('')}</dl>`
        : '',
    'home studio figures');
    return section;
  }, 'home studio');

  // Testimonials carousel.
  html = replaceOnce(html, /(<section class="wrap section-tight testimonials"[\s\S]*?<\/section>)(<script type="module">[\s\S]*?<\/script>)?/, (_match, section, script = '') => {
    const t = data.testimonials;
    const items = t.items.filter(item => item.quote || item.names);
    if (!items.length) return '';
    const cid = cidOf(section);
    const figures = [...section.matchAll(/<figure class="testimonial"[\s\S]*?<\/figure>/g)].map(m => m[0]);
    const imgs = figures.map(fig => fig.match(/<img [^>]*>/)?.[0] ?? '').filter(Boolean);
    const template = imgs[0] ?? `<img src="" alt="" loading="lazy" decoding="async"${cid}="true" width="960" height="1200">`;
    const total = items.length;
    const track = items.map((item, i) => {
      const media = item.image ? `<div class="testimonial-media"${cid}>${renderImg(template, item.image, item.imageAlt, imgs)}</div>` : '';
      const quote = paragraphs(item.quote).map(p => `<p${cid}>${esc(p)}</p>`).join('');
      const meta = [item.category, item.context].filter(Boolean).map(v => `<span${cid}>${esc(v)}</span>`).join('');
      return `<figure class="testimonial" data-testimonial aria-label="${i + 1} / ${total}"${cid}>${media}<blockquote class="testimonial-quote"${cid}>${quote}</blockquote><figcaption class="testimonial-who"${cid}><span class="testimonial-names"${cid}>${esc(item.names)}</span>${meta ? `<span class="label label-soft meta-row"${cid}>${meta}</span>` : ''}</figcaption></figure>`;
    }).join('');
    const dots = items.map((item, i) =>
      `<li${cid}><button type="button" class="testimonials-dot" data-testimonials-dot aria-current="${i === 0}" aria-label="${escAttr(`Show testimonial ${i + 1}: ${item.names}`)}"${cid}></button></li>`).join('');
    section = replaceOnce(section, /(<h2 class="title-lg" id="testimonials-title"[^>]*>)[\s\S]*?(<\/h2>)/, (_, a, b) => `${a}${esc(t.title)}${b}`, 'testimonials title');
    section = replaceOnce(section, /(<div class="testimonials-track"[^>]*>)[\s\S]*<\/figure>(<\/div>)/, (_, a, b) => `${a}${track}${b}`, 'testimonials track');
    section = replaceOnce(section, /(<ol class="testimonials-dots"[^>]*>)[\s\S]*?(<\/ol>)/, (_, a, b) => `${a}${dots}${b}`, 'testimonials dots');
    return section + script;
  }, 'testimonials');

  // Closing call to action.
  html = replaceOnce(html, /<section class="wrap home-call-section">[\s\S]*?<\/section>/, section => {
    const c = data.cta;
    section = replaceOnce(section, /(<h2 class="title-xl home-call-title"[^>]*>)[\s\S]*?(<\/h2>)/, (_, a, b) => `${a}${esc(c.title)}${b}`, 'call title');
    section = replaceOnce(section, /(<p class="lede"[^>]*>)[\s\S]*?(<\/p>)/, (_, a, b) => (c.text ? `${a}${esc(c.text)}${b}` : ''), 'call text');
    return replaceOnce(section, /<a class="(btn [^"]*)" href="[^"]*"([^>]*)><span>[\s\S]*?<\/span><\/a>/, (_, cls, attrs) => button(cls, c.buttonLink, c.buttonLabel, attrs), 'call button');
  }, 'home call');

  return setHead(html, data.seo.title, data.seo.description);
}

// ---------------------------------------------------------------------------------------------- studio

export function studio(html: string, data: StudioPage, settings: SiteSettings): string {
  html = pageHead(html, data.title, data.lede);
  html = replaceOnce(html, /(<div class="media media-panorama"[^>]*>)(<img [^>]*>)/, (_, a, img) => `${a}${renderImg(img, data.image, data.imageAlt)}`, 'studio image');
  html = replaceOnce(html, /(<main[\s\S]*?<div class="prose prose-page">)[\s\S]*?(<\/div><\/div>)/, (_, a, b) => `${a}${markdown(data.body, vars(settings))}${b}`, 'studio body');
  return setHead(html, withName(data.seo.title, settings), data.seo.description);
}

// ---------------------------------------------------------------------------------------------- pricing

export function pricing(html: string, data: PricingPage, settings: SiteSettings): string {
  html = pageHead(html, data.title, data.lede);
  html = replaceOnce(html, /(<div class="pricing-grid"[^>]*>)([\s\S]*<\/article>)(<\/div>)/, (_, open, cards, close) => {
    const cid = cidOf(open);
    const check = cards.match(/<li[^>]*>(<svg[\s\S]*?<\/svg>)/)?.[1] ?? '';
    const body = data.packages.map(p => {
      const badge = p.badge ? `<p class="pricing-badge"${cid}>${esc(p.badge)}</p>` : '';
      const note = p.priceNote ? `<span class="pricing-price-note"${cid}>${esc(p.priceNote)}</span>` : '';
      const summary = p.summary ? `<p class="pricing-summary"${cid}>${esc(p.summary)}</p>` : '';
      const includes = p.includes.filter(Boolean);
      const list = includes.length
        ? `<div class="pricing-includes"${cid}>${p.includesTitle ? `<p class="pricing-includes-title"${cid}>${esc(p.includesTitle)}</p>` : ''}<ul${cid}>${includes.map(item => `<li${cid}>${check}<span${cid}>${esc(item)}</span></li>`).join('')}</ul></div>`
        : '';
      const cta = button(`btn ${p.featured ? 'btn-accent' : 'btn-outline'}`, p.buttonLink, p.buttonLabel, '', cid);
      return `<article class="pricing-card${p.featured ? ' pricing-card-featured' : ''}" data-reveal="up"${cid}>${badge}<div class="pricing-head"${cid}><h2 class="pricing-name"${cid}>${esc(p.name)}</h2><p class="pricing-price"${cid}>${note}<span${cid}>${esc(p.price)}</span></p>${summary}</div>${list}${cta}</article>`;
    }).join('');
    return `${open}${body}${close}`;
  }, 'pricing packages');
  html = replaceOnce(html, /(<p class="pricing-note"[^>]*>)[\s\S]*?(<\/p>)/, (_, a, b) => (data.note ? `${a}${esc(data.note)}${b}` : ''), 'pricing note');
  return setHead(html, withName(data.seo.title, settings), data.seo.description);
}

// ---------------------------------------------------------------------------------------------- contact

export function contact(html: string, data: ContactPage, settings: SiteSettings): string {
  html = pageHead(html, data.title, data.lede);
  html = replaceOnce(html, /(<div class="prose prose-page"([^>]*)>)[\s\S]*?(<\/div><aside)/, (_, open, cid, close) => {
    const email = settings.email
      ? `<h2${cid}>${esc(data.emailHeading)}</h2><p${cid}><a href="mailto:${escAttr(settings.email)}"${cid}>${esc(settings.email)}</a></p>`
      : '';
    const sections = data.sections.map(s =>
      `${s.heading ? `<h2${cid}>${esc(s.heading)}</h2>` : ''}${paragraphs(s.text).map(p => `<p${cid}>${esc(p)}</p>`).join('')}`).join('');
    return `${open}${email}${sections}${close}`;
  }, 'contact intro');

  html = replaceOnce(html, /(<aside class="contact-aside"[^>]*>)([\s\S]*?)(<\/aside>)/, (_, open, inner, close) => {
    const cid = cidOf(open);
    const dls = [...inner.matchAll(/<dl class="contact-detail"[\s\S]*?<\/dl>/g)].map(m => m[0]);
    const based = [settings.location, settings.locationNote].filter(Boolean);
    const out: string[] = [];
    if (based.length) out.push(`<dl class="contact-detail"${cid}><dt${cid}>${esc(data.basedLabel)}</dt>${based.map(v => `<dd${cid}>${esc(v)}</dd>`).join('')}</dl>`);
    if (settings.phone) {
      const tel = settings.phone.replace(/[^\d+]/g, '');
      out.push(`<dl class="contact-detail"${cid}><dt${cid}>${esc(data.phoneLabel)}</dt><dd${cid}><a href="tel:${escAttr(tel)}"${cid}>${esc(settings.phone)}</a></dd></dl>`);
    }
    // The Follow block keeps its icons (already rewritten from settings by the global pass).
    const follow = dls.find(dl => dl.includes('contact-socials'));
    if (follow && settings.socials.length) out.push(follow.replace(/(<dt[^>]*>)[\s\S]*?(<\/dt>)/, (_m: string, a: string, b: string) => `${a}${esc(data.followLabel)}${b}`));
    return `${open}${out.join('')}${close}`;
  }, 'contact aside');

  const f = data.form;
  for (const [id, label] of [['contact-name', f.nameLabel], ['contact-email', f.emailLabel], ['contact-date', f.dateLabel], ['contact-place', f.placeLabel], ['contact-message', f.messageLabel]]) {
    html = replaceOnce(html, new RegExp(`(<label class="form-label" for="${id}"[^>]*>)[\\s\\S]*?(</label>)`), (_, a, b) => `${a}${esc(label)}${b}`, `contact label ${id}`);
  }
  html = replaceOnce(html, /(<form class="contact-form[\s\S]*?<button class="btn[^"]*" type="submit"[^>]*><span[^>]*>)[\s\S]*?(<\/span>)/, (_, a, b) => `${a}${esc(f.buttonLabel)}${b}`, 'contact button');
  return setHead(html, withName(data.seo.title, settings), data.seo.description);
}

// ---------------------------------------------------------------------------------------------- privacy

export function privacy(html: string, data: PrivacyPage, settings: SiteSettings): string {
  html = pageHead(html, data.title, data.lede);
  html = replaceOnce(html, /(<main[\s\S]*?<div class="prose prose-page">)[\s\S]*?(<\/div><\/div>)/, (_, a, b) => `${a}${markdown(data.body, vars(settings))}${b}`, 'privacy body');
  return setHead(html, withName(data.seo.title, settings), data.seo.description);
}

// ----------------------------------------------------------------------------------------------

const vars = (settings: SiteSettings) => ({ email: settings.email, phone: settings.phone, name: settings.name });

export const withName = (title: string, settings: SiteSettings) => (title ? `${title} | ${settings.name}` : '');
