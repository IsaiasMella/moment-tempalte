#!/usr/bin/env node
/**
 * Extracts the editable content of the main pages from the reference HTML
 * (src/reference/**) into CMS data files:
 *   src/content/settings/site.yml
 *   src/content/pages/{home,studio,pricing,contact,privacy}.yml
 *
 * Usage: node scripts/extract-pages.mjs [--force]
 * Existing files are kept unless --force is passed (they may hold CMS edits).
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const root = path.resolve('src/reference');
const read = route => fs.readFileSync(path.join(root, route, 'index.html'), 'utf8');
const force = process.argv.includes('--force');

const decode = s => s
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&copy;/g, '©').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const strip = s => decode(s.replace(/<[^>]*>/g, ''));
const cid = ' data-astro-cid-\\w+';

function one(html, re, label) {
  const m = html.match(re);
  if (!m) throw new Error(`extract-pages: could not find ${label}`);
  return m;
}
function all(html, re) {
  return [...html.matchAll(re)];
}
function meta(html, name) {
  return decode(one(html, new RegExp(`<meta name="${name}" content="([^"]*)"`), name)[1]);
}
function title(html) {
  return decode(one(html, /<title>([\s\S]*?)<\/title>/, 'title')[1]);
}
function attr(tag, name) {
  const m = tag.match(new RegExp(` ${name}="([^"]*)"`));
  return m ? decode(m[1]) : '';
}
const links = ul => all(ul, /<li><a href="([^"]*)"[^>]*>([\s\S]*?)<\/a><\/li>/g).map(m => ({ label: strip(m[2]), href: decode(m[1]) }));

/** Prose HTML -> Markdown (headings, paragraphs, links, emphasis, lists). */
function toMarkdown(html, email) {
  const inline = s => decode(
    s.replace(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, t) => `[${t}](${href})`)
      .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/g, '**$2**')
      .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/g, '*$2*')
      .replace(/<br\s*\/?>/g, '  \n')
      .replace(/<[^>]*>/g, '')
  ).replaceAll(email, '{email}');
  const blocks = [];
  for (const m of html.matchAll(/<(h[1-6]|p|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const [, tag, body] = m;
    if (tag[0] === 'h') blocks.push(`${'#'.repeat(Number(tag[1]))} ${inline(body)}`);
    else if (tag === 'p') blocks.push(inline(body));
    else if (tag === 'blockquote') blocks.push(`> ${inline(body)}`);
    else blocks.push(all(body, /<li\b[^>]*>([\s\S]*?)<\/li>/g).map((li, i) => `${tag === 'ol' ? `${i + 1}.` : '-'} ${inline(li[1])}`).join('\n'));
  }
  return blocks.join('\n\n') + '\n';
}

function pageHead(html) {
  const h1 = one(html, /<h1 class="display page-head-title"[^>]*>([\s\S]*?)<\/h1>/, 'page title');
  const lede = one(html, /<p class="lede page-head-lede"[^>]*>([\s\S]*?)<\/p>/, 'page lede');
  return { title: strip(h1[1]), lede: strip(lede[1]) };
}
const seoOf = (html, suffix) => ({ title: title(html).replace(suffix, ''), description: meta(html, 'description') });

// ---------------------------------------------------------------- settings
const home = read('');
const siteName = strip(one(home, /<a class="wordmark-link"[^>]*>[\s\S]*?<span class="sr-only">([\s\S]*?)<\/span>/, 'site name')[1]);
const suffix = ` | ${siteName}`;
const website = JSON.parse(one(home, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/, 'json-ld')[1]);
const socials = all(one(home, /<div class="site-footer-socials">([\s\S]*?)<\/div>/, 'footer socials')[1],
  /<a class="icon-btn" href="([^"]*)" rel="me noopener" aria-label="([^"]*)"[^>]*><span class="[^"]*" aria-hidden="true"><svg[^>]*class="bi bi-([\w-]+)"/g)
  .map(([, url, label, icon]) => {
    const platform = icon === 'envelope' ? 'email' : icon === 'telephone' ? 'phone' : icon === 'twitter-x' ? 'x' : icon === 'globe2' ? 'website' : icon;
    return platform === 'email' ? { platform, label: decode(label) } : { platform, label: decode(label), url: decode(url) };
  });
const email = decode(one(home, /href="mailto:([^"]*)"/, 'email')[1]);
const contactHtml = read('contact/');
const based = all(one(contactHtml, new RegExp(`<dl class="contact-detail"${cid}><dt${cid}>[^<]*</dt>((?:<dd${cid}>[^<]*</dd>)+)</dl>`), 'based')[1], /<dd[^>]*>([^<]*)<\/dd>/g).map(m => strip(m[1]));
const footer = one(home, /<footer class="site-footer[\s\S]*?<\/footer>/, 'footer')[0];

const settings = {
  name: siteName,
  tagline: website.alternateName ?? '',
  photographer: website.publisher?.founder?.name ?? '',
  email,
  phone: '',
  location: based[0] ?? '',
  locationNote: based[1] ?? '',
  logo: '',
  seo: {
    description: website.description ?? '',
    ogImage: new URL(decode(one(home, /<meta property="og:image" content="([^"]*)"/, 'og:image')[1])).pathname,
    ogImageAlt: decode(one(home, /<meta property="og:image:alt" content="([^"]*)"/, 'og:image:alt')[1]),
  },
  socials,
  nav: {
    primary: links(one(home, /<ul class="menu-list menu-list-primary">([\s\S]*?)<\/ul>/, 'primary nav')[1]),
    secondaryHeading: strip(one(home, /<p class="menu-group">([\s\S]*?)<\/p>/, 'menu group')[1]),
    secondary: links(one(home, /<ul class="menu-list menu-list-secondary">([\s\S]*?)<\/ul>/, 'secondary nav')[1]),
  },
  footer: {
    signupTitle: strip(one(footer, /<h2 class="title-lg site-footer-signup-title">([\s\S]*?)<\/h2>/, 'signup title')[1]),
    signupText: strip(one(footer, /<div class="site-footer-signup"><div><h2[\s\S]*?<\/h2><p[^>]*>([\s\S]*?)<\/p>/, 'signup text')[1]),
    signupPlaceholder: attr(one(footer, /<input id="footer-signup"[^>]*>/, 'signup input')[0], 'placeholder'),
    signupButton: strip(one(footer, /<button type="submit"[^>]*><span>([\s\S]*?)<\/span>/, 'signup button')[1]),
    description: strip(one(footer, /<p class="site-footer-description">([\s\S]*?)<\/p>/, 'footer description')[1]),
    columns: all(footer, /<nav class="site-footer-nav"[^>]*><p class="site-footer-heading">([\s\S]*?)<\/p><ul>([\s\S]*?)<\/ul><\/nav>/g)
      .map(m => ({ heading: strip(m[1]), links: links(m[2]) })),
    copyright: strip(one(footer, /<p class="site-footer-credits"><span>([\s\S]*?)<\/span><\/p>/, 'copyright')[1]),
    credit: strip(one(footer, /<p class="site-footer-credits">[\s\S]*?<\/p><p>([\s\S]*?)<\/p>/, 'credit')[1]),
  },
  forms: { enquiryAction: '', newsletterAction: '' },
};

// ---------------------------------------------------------------- home
const homeStudio = one(home, /<section class="home-studio">[\s\S]*?<\/section>/, 'home studio')[0];
const homeTestimonials = one(home, /<section class="wrap section-tight testimonials"[\s\S]*?<\/section>/, 'testimonials')[0];
const homeCall = one(home, /<section class="wrap home-call-section">[\s\S]*?<\/section>/, 'home call')[0];
const studioImg = one(homeStudio, /<img [^>]*>/, 'home studio image')[0];
const homeBtn = one(homeStudio, /<a class="btn[^"]*" href="([^"]*)"[^>]*><span>([\s\S]*?)<\/span><\/a>/, 'home studio button');
const callBtn = one(homeCall, /<a class="btn[^"]*" href="([^"]*)"[^>]*><span>([\s\S]*?)<\/span><\/a>/, 'home call button');

const homeData = {
  seo: { title: title(home), description: meta(home, 'description') },
  heading: strip(one(home, /<main[^>]*><h1 class="sr-only">([\s\S]*?)<\/h1>/, 'home h1')[1]),
  studio: {
    image: attr(studioImg, 'src'),
    imageAlt: attr(studioImg, 'alt'),
    title: strip(one(homeStudio, /<h2[^>]*>([\s\S]*?)<\/h2>/, 'home studio title')[1]),
    text: strip(one(homeStudio, /<p class="home-studio-text"[^>]*>([\s\S]*?)<\/p>/, 'home studio text')[1]),
    buttonLabel: strip(homeBtn[2]),
    buttonLink: decode(homeBtn[1]),
    figures: all(homeStudio, /<div class="home-studio-figure"><dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/g).map(m => ({ label: strip(m[1]), value: strip(m[2]) })),
  },
  testimonials: {
    title: strip(one(homeTestimonials, /<h2[^>]*>([\s\S]*?)<\/h2>/, 'testimonials title')[1]),
    items: all(homeTestimonials, /<figure class="testimonial"[\s\S]*?<\/figure>/g).map(([fig]) => {
      const img = fig.match(/<img [^>]*>/)?.[0] ?? '';
      const meta = all(fig.match(/<span class="label[^"]*"[^>]*>([\s\S]*?)<\/span><\/figcaption>/)?.[1] ?? '', /<span[^>]*>([\s\S]*?)<\/span>/g).map(m => strip(m[1]));
      return {
        quote: all(one(fig, /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/, 'quote')[1], /<p[^>]*>([\s\S]*?)<\/p>/g).map(m => strip(m[1])).join('\n\n'),
        names: strip(one(fig, /<span class="testimonial-names"[^>]*>([\s\S]*?)<\/span>/, 'names')[1]),
        category: meta[0] ?? '',
        context: meta[1] ?? '',
        image: attr(img, 'src'),
        imageAlt: attr(img, 'alt'),
      };
    }),
  },
  cta: {
    title: strip(one(homeCall, /<h2[^>]*>([\s\S]*?)<\/h2>/, 'call title')[1]),
    text: strip(one(homeCall, /<p class="lede"[^>]*>([\s\S]*?)<\/p>/, 'call text')[1]),
    buttonLabel: strip(callBtn[2]),
    buttonLink: decode(callBtn[1]),
  },
};

// ---------------------------------------------------------------- studio
const studio = read('studio/');
const studioMain = one(studio, /<main[\s\S]*?<\/main>/, 'studio main')[0];
const studioHero = one(studioMain, /<div class="media media-panorama"[^>]*>(<img [^>]*>)/, 'studio image')[1];
const studioData = {
  seo: seoOf(studio, suffix),
  ...pageHead(studioMain),
  image: attr(studioHero, 'src'),
  imageAlt: attr(studioHero, 'alt'),
  body: toMarkdown(one(studioMain, /<div class="prose prose-page">([\s\S]*?)<\/div><\/div>/, 'studio prose')[1], email),
};

// ---------------------------------------------------------------- pricing
const pricing = read('pricing/');
const pricingMain = one(pricing, /<main[\s\S]*?<\/main>/, 'pricing main')[0];
const pricingData = {
  seo: seoOf(pricing, suffix),
  ...pageHead(pricingMain),
  packages: all(pricingMain, /<article class="pricing-card([^"]*)"[\s\S]*?<\/article>/g).map(([card, extra]) => {
    const price = one(card, /<p class="pricing-price"[^>]*>([\s\S]*?)<\/p>/, 'price')[1];
    const btn = one(card, /<a class="btn[^"]*" href="([^"]*)"[^>]*><span[^>]*>([\s\S]*?)<\/span><\/a>/, 'pricing button');
    return {
      name: strip(one(card, /<h2 class="pricing-name"[^>]*>([\s\S]*?)<\/h2>/, 'name')[1]),
      priceNote: strip(price.match(/<span class="pricing-price-note"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? ''),
      price: strip(price.replace(/<span class="pricing-price-note"[^>]*>[\s\S]*?<\/span>/, '')),
      summary: strip(card.match(/<p class="pricing-summary"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? ''),
      featured: extra.includes('pricing-card-featured'),
      badge: strip(card.match(/<p class="pricing-badge"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? ''),
      includesTitle: strip(card.match(/<p class="pricing-includes-title"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? ''),
      includes: all(card, /<li[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span><\/li>/g).map(m => strip(m[1])),
      buttonLabel: strip(btn[2]),
      buttonLink: decode(btn[1]),
    };
  }),
  note: strip(pricingMain.match(/<p class="pricing-note"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? ''),
};

// ---------------------------------------------------------------- contact
const contactMain = one(contactHtml, /<main[\s\S]*?<\/main>/, 'contact main')[0];
const contactProse = one(contactMain, /<div class="prose prose-page"[^>]*>([\s\S]*?)<\/div><aside/, 'contact prose')[1];
const proseBlocks = all(contactProse, /<h2[^>]*>([\s\S]*?)<\/h2>((?:<p[^>]*>[\s\S]*?<\/p>)*)/g);
const label = id => strip(one(contactMain, new RegExp(`<label class="form-label" for="${id}"[^>]*>([\\s\\S]*?)</label>`), id)[1]);
const dts = all(contactMain, /<dl class="contact-detail"[^>]*><dt[^>]*>([\s\S]*?)<\/dt>/g).map(m => strip(m[1]));
const contactData = {
  seo: seoOf(contactHtml, suffix),
  ...pageHead(contactMain),
  emailHeading: strip(proseBlocks[0][1]),
  sections: proseBlocks.slice(1).map(m => ({
    heading: strip(m[1]),
    text: all(m[2], /<p[^>]*>([\s\S]*?)<\/p>/g).map(p => strip(p[1])).join('\n\n'),
  })),
  basedLabel: dts[0] ?? '',
  phoneLabel: 'Phone',
  followLabel: dts[1] ?? '',
  form: {
    nameLabel: label('contact-name'),
    emailLabel: label('contact-email'),
    dateLabel: label('contact-date'),
    placeLabel: label('contact-place'),
    messageLabel: label('contact-message'),
    buttonLabel: strip(one(contactMain, /<button class="btn[^"]*" type="submit"[^>]*><span[^>]*>([\s\S]*?)<\/span>/, 'contact button')[1]),
  },
};

// ---------------------------------------------------------------- privacy
const privacy = read('privacy/');
const privacyMain = one(privacy, /<main[\s\S]*?<\/main>/, 'privacy main')[0];
const privacyData = {
  seo: seoOf(privacy, suffix),
  ...pageHead(privacyMain),
  body: toMarkdown(one(privacyMain, /<div class="prose prose-page">([\s\S]*?)<\/div><\/div>/, 'privacy prose')[1], email),
};

// ---------------------------------------------------------------- write
const files = {
  'src/content/settings/site.yml': settings,
  'src/content/pages/home.yml': homeData,
  'src/content/pages/studio.yml': studioData,
  'src/content/pages/pricing.yml': pricingData,
  'src/content/pages/contact.yml': contactData,
  'src/content/pages/privacy.yml': privacyData,
};
for (const [file, data] of Object.entries(files)) {
  if (fs.existsSync(file) && !force) {
    console.log(`skip ${file} (exists, use --force to overwrite)`);
    continue;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, yaml.dump(data, { lineWidth: -1, noRefs: true, quotingType: '"' }));
  console.log(`wrote ${file}`);
}
