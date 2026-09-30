/**
 * Enhancements for Markdown content (Prose.astro):
 *  - wraps each table in a focusable, horizontally scrollable region;
 *  - makes standalone images open in the lightbox (group "story").
 * The region's fallback label comes from `data-table-label` on the prose block.
 */
document.querySelectorAll<HTMLElement>('.prose').forEach((prose) => {
  const fallbackLabel = prose.dataset.tableLabel ?? 'Table';

  prose.querySelectorAll('table').forEach((table) => {
    if (table.closest('.table-scroll')) return;
    const region = document.createElement('div');
    region.className = 'table-scroll';
    region.tabIndex = 0;
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', table.caption?.textContent?.trim() || fallbackLabel);
    table.replaceWith(region);
    region.append(table);
  });

  prose.querySelectorAll<HTMLImageElement>(':scope > p > img, :scope > img').forEach((img) => {
    img.dataset.lightbox = '';
    img.dataset.lightboxGroup = 'story';
    img.dataset.lightboxSrc = img.currentSrc || img.src;
    img.dataset.lightboxAlt = img.alt;
    img.style.cursor = 'zoom-in';
  });
});
