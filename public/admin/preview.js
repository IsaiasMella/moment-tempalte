/**
 * Vista previa de álbumes con el diseño real del sitio.
 * Reproduce el marcado de los componentes del álbum (mismas clases):
 *   src/components/album/AlbumHero.astro, Blocks.astro, Figure.astro, Gallery.astro, Pullquote.astro
 * y carga la hoja de estilos compilada del sitio, cuya URL (con hash) le pasa
 * src/pages/admin/index.astro en el atributo data-styles de este <script>.
 * Si cambiás el marcado de esos componentes, actualizá también render() acá.
 */
(() => {
  const styles = document.currentScript?.dataset.styles;
  const CMS = window.CMS;
  if (!CMS) return;
  const h = CMS.React.createElement;

  if (styles) CMS.registerPreviewStyle(styles);
  CMS.registerPreviewStyle(`
    body { margin: 0; }
    .preview-empty { padding: 4rem 1.5rem; text-align: center; opacity: .6; font-family: system-ui, sans-serif; }
  `, { raw: true });

  const CATEGORY = { weddings: 'Weddings', portraits: 'Portraits' };
  const FIGURE = { regular: 'card', wide: 'card card-wide', full: 'card card-full' };

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

  const inline = (source) => esc(source)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(\S(?:[\s\S]*?\S)?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(\S(?:[\s\S]*?\S)?)\*(?![*\w])/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(\S(?:[\s\S]*?\S)?)_(?![_\w])/g, '$1<em>$2</em>')
    .replace(/ {2,}\n|\\\n/g, '<br>');

  const parts = (text) => String(text ?? '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

  const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
      : '';
  };

  function render(data, url) {
    const photo = (src, alt, extra = '') => (src ? `<img src="${esc(url(src))}" alt="${esc(alt)}" decoding="async"${extra}>` : '');
    const kicker = [CATEGORY[data.category] ?? '', data.location, formatDate(data.date)]
      .filter(Boolean).map((part) => `<span>${esc(part)}</span>`).join('');
    const cover = data.cover ?? {};

    let header;
    if (data.layout === 'note') {
      header = `<header class="wrap wrap-mid post-head"><p class="label label-soft meta-row post-kicker">${kicker}</p>`
        + `<h1 class="display post-head-title">${esc(data.title)}</h1><p class="lede page-head-lede">${esc(data.lede)}</p></header>`
        + `<div class="wrap"><figure class="post-figure-inline"><div class="media media-landscape">${photo(cover.src, cover.alt)}</div></figure></div>`;
    } else {
      header = `<header class="post-hero"><div class="post-hero-media">${photo(cover.src, cover.alt)}</div><div class="post-hero-scrim"></div>`
        + `<div class="wrap post-hero-body"><p class="label meta-row post-kicker">${kicker}</p><h1 class="display post-hero-title">${esc(data.title)}</h1></div></header>`
        + `<div class="wrap wrap-reading"><p class="post-lede">${esc(data.lede)}</p></div>`;
    }

    const blocks = (data.blocks ?? []).map((block) => {
      switch (block?.type) {
        case 'text':
          return parts(block.body).map((part) => `<p>${inline(part)}</p>`).join('');
        case 'heading':
          return `<h2>${esc(block.text)}</h2>`;
        case 'quote': {
          const text = parts(block.text);
          const body = text.length > 1 ? text.map((part) => `<p>${inline(part)}</p>`).join('') : inline(block.text ?? '');
          const cite = block.author ? `<cite class="pullquote-attribution">${esc(block.author)}</cite>` : '';
          return `<blockquote class="pullquote${block.style === 'alt' ? ' pullquote-alt' : ''}">${body}${cite}</blockquote>`;
        }
        case 'image': {
          const caption = block.caption ? `<figcaption class="figure-caption">${esc(block.caption)}</figcaption>` : '';
          return `<figure class="${FIGURE[block.size] ?? FIGURE.wide}"><span class="figure-frame">${photo(block.src, block.alt)}</span>${caption}</figure>`;
        }
        case 'gallery': {
          const frames = (block.images ?? []).filter((image) => image?.src)
            .map((image) => `<span class="gallery-frame">${photo(image.src, image.alt, ' loading="lazy"')}</span>`).join('');
          const caption = block.caption ? `<figcaption class="gallery-caption">${esc(block.caption)}</figcaption>` : '';
          return frames ? `<figure class="gallery"><div class="gallery-rows">${frames}</div>${caption}</figure>` : '';
        }
        default:
          return '';
      }
    }).join('\n');

    const empty = !data.title && !cover.src && !blocks
      ? '<p class="preview-empty">Completá el título y la portada para ver la vista previa.</p>' : '';

    return `${empty}<main id="content" class="main"><article>${header}<div class="wrap"><div class="prose">${blocks}</div></div></article></main>`;
  }

  function AlbumPreview({ entry, getAsset, document: doc }) {
    const data = entry.getIn(['data'])?.toJS?.() ?? {};
    // Imágenes recién subidas (aún sin guardar) se resuelven con getAsset; las existentes, por su ruta.
    const url = (src) => getAsset(src)?.url || src;
    if (doc) doc.documentElement.dataset.theme = 'light';
    return h('div', { dangerouslySetInnerHTML: { __html: render(data, url) } });
  }

  CMS.registerPreviewTemplate('albums', AlbumPreview);
})();
