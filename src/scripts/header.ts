/**
 * Header pinning (Header.astro). Past the header's own height, scrolling down hides
 * it (`is-hidden`) and scrolling up brings it back pinned to the top (`is-pinned`).
 * Back near the top of the page it returns to its normal, in-flow state.
 */
const header = document.querySelector<HTMLElement>('[data-site-header]');

if (header) {
  let ticking = false;
  let lastY = window.scrollY;

  const update = () => {
    const y = window.scrollY;
    const pastHeader = y > header.offsetHeight;

    if (y <= 8) {
      header.classList.remove('is-pinned', 'is-hidden');
    } else if (y < lastY && pastHeader) {
      // Scrolling up: pin it first while hidden, so it slides in rather than jumping.
      if (!header.classList.contains('is-pinned')) {
        header.classList.add('is-pinned', 'is-hidden');
        header.getBoundingClientRect();
      }
      header.classList.remove('is-hidden');
    } else if (y > lastY && pastHeader) {
      header.classList.add('is-hidden');
    }

    lastY = y;
    ticking = false;
  };

  update();
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    },
    { passive: true },
  );
}
