/**
 * Responsive `sizes` for `<img data-autosize>`: sets `sizes` to the image's real
 * rendered width (rounded up to 40px steps, and widened for `object-fit: cover`
 * crops) so the browser picks the smallest adequate `srcset` candidate.
 * Re-measures on load and whenever an image is resized.
 */
const STEP_PX = 40;

const fit = (img: HTMLImageElement) => {
  const box = img.getBoundingClientRect();
  if (!box.width) return;
  let width = box.width;
  const ratio = Number(img.getAttribute('width')) / Number(img.getAttribute('height'));
  if (ratio && getComputedStyle(img).objectFit === 'cover') width = Math.max(width, box.height * ratio);
  const sizes = `${Math.ceil(width / STEP_PX) * STEP_PX}px`;
  if (img.sizes !== sizes) img.sizes = sizes;
};

const images = document.querySelectorAll<HTMLImageElement>('img[data-autosize]');

if (images.length) {
  const fitAll = () => images.forEach(fit);
  fitAll();
  window.addEventListener('load', fitAll);

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver((entries) => entries.forEach((entry) => fit(entry.target as HTMLImageElement)));
    images.forEach((img) => observer.observe(img));
  } else {
    let ticking = false;
    window.addEventListener(
      'resize',
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          ticking = false;
          fitAll();
        });
      },
      { passive: true },
    );
  }
}
