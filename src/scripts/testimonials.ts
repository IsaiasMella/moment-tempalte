/**
 * Testimonials carousel (`[data-testimonials]`, Testimonials.astro).
 *
 * The track is a native horizontal scroll-snap container (swipeable, works
 * without JS). This adds the prev/next buttons, the dots, arrow-key navigation
 * and keeps the current dot in sync while the visitor scrolls.
 */
document.querySelectorAll<HTMLElement>('[data-testimonials]').forEach((section) => {
  const track = section.querySelector<HTMLElement>('[data-testimonials-track]');
  const items = [...section.querySelectorAll<HTMLElement>('[data-testimonial]')];
  const dots = [...section.querySelectorAll<HTMLElement>('[data-testimonials-dot]')];
  if (!track || items.length < 2) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;

  const markCurrent = (index: number) => {
    current = index;
    dots.forEach((dot, i) => dot.setAttribute('aria-current', i === index ? 'true' : 'false'));
  };

  const go = (index: number) => {
    const target = (index + items.length) % items.length;
    track.scrollTo({ left: items[target].offsetLeft, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    markCurrent(target);
  };

  section.querySelector('[data-testimonials-prev]')?.addEventListener('click', () => go(current - 1));
  section.querySelector('[data-testimonials-next]')?.addEventListener('click', () => go(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') go(current - 1);
    if (event.key === 'ArrowRight') go(current + 1);
  });

  // Follow manual scrolling / swiping: the testimonial mostly in view is current.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) markCurrent(items.indexOf(entry.target as HTMLElement));
        });
      },
      { root: track, threshold: 0.6 },
    );
    items.forEach((item) => observer.observe(item));
  }
});

export {}; // a module: keeps these names out of the global scope
