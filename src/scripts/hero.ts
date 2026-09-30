/**
 * Home page hero carousel (`[data-hero]`, HomeHero.astro).
 *
 * One slide is `.is-current` (visible); the next one is "staged" ahead of time
 * (`.is-staged`, image switched to eager loading) so the cross-fade never shows
 * a blank frame. Advances every `--hero-interval` (CSS, default 6s), pauses
 * while the tab is hidden, and starts paused when the visitor prefers reduced
 * motion. Dots jump to a slide; the pause button toggles autoplay.
 */
const hero = document.querySelector<HTMLElement>('[data-hero]');

if (hero) {
  const slides = [...hero.querySelectorAll<HTMLElement>('.home-hero-slide')];
  const dots = [...document.querySelectorAll<HTMLElement>('[data-hero-dot]')];
  const pauseButton = document.querySelector<HTMLElement>('[data-hero-pause]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const interval = (Number.parseFloat(getComputedStyle(hero).getPropertyValue('--hero-interval')) || 6) * 1000;

  if (slides.length > 1) {
    let current = 0;
    let paused = reducedMotion.matches;
    let timer = 0;

    const wrap = (index: number) => (index + slides.length) % slides.length;

    /** Prepares a slide (loads its image) before it is shown. */
    const stage = (index: number) => {
      const slide = slides[wrap(index)];
      if (slide.classList.contains('is-staged')) return;
      slide.classList.add('is-staged');
      slide.querySelector('img')?.setAttribute('loading', 'eager');
      void slide.offsetWidth; // force a reflow so the transition starts from the staged state
    };

    const show = (index: number) => {
      const previous = current;
      current = wrap(index);
      stage(current);
      slides.forEach((slide, i) => {
        const isCurrent = i === current;
        slide.classList.toggle('is-current', isCurrent);
        slide.classList.toggle('is-staged', isCurrent || i === previous);
        slide.inert = !isCurrent;
      });
      dots.forEach((dot, i) => dot.setAttribute('aria-current', i === current ? 'true' : 'false'));
    };

    const stop = () => window.clearTimeout(timer);

    /** (Re)starts the countdown to the next slide, unless paused. */
    const schedule = () => {
      stop();
      if (paused) return;
      stage(current + 1);
      timer = window.setTimeout(() => {
        show(current + 1);
        schedule();
      }, interval);
    };

    const setPaused = (value: boolean) => {
      paused = value;
      hero.classList.toggle('is-paused', paused);
      pauseButton?.setAttribute('aria-pressed', String(paused));
      pauseButton?.setAttribute('aria-label', (paused ? pauseButton.dataset.labelPlay : pauseButton.dataset.labelPause) ?? '');
      schedule();
    };

    dots.forEach((dot, i) =>
      dot.addEventListener('click', () => {
        show(i);
        schedule();
      }),
    );
    pauseButton?.addEventListener('click', () => setPaused(!paused));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else schedule();
    });
    setPaused(paused);
  }
}

export {}; // a module: keeps these names out of the global scope
