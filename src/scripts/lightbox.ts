/**
 * Photo viewer (Lightbox.astro). A click on any `[data-lightbox]` element opens the
 * dialog with every element of the same `data-lightbox-group`, in DOM order.
 *
 * Data attributes read from each trigger:
 *   data-lightbox-src / -srcset   image to show (srcset optional)
 *   data-lightbox-alt             alt text
 *   data-lightbox-caption / -credit  caption line ("caption — credit")
 *
 * Keys: ← → to navigate, Escape to close. Touch: horizontal swipe to navigate.
 */
const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox-dialog]');

if (dialog && typeof dialog.showModal === 'function') {
  const image = dialog.querySelector<HTMLImageElement>('[data-lightbox-img]')!;
  const text = dialog.querySelector<HTMLElement>('[data-lightbox-text]')!;
  const count = dialog.querySelector<HTMLElement>('[data-lightbox-count]')!;
  const prev = dialog.querySelector<HTMLButtonElement>('[data-lightbox-prev]')!;
  const next = dialog.querySelector<HTMLButtonElement>('[data-lightbox-next]')!;
  const root = document.documentElement;

  /** Triggers of the group currently open, and the index being shown. */
  let items: HTMLElement[] = [];
  let index = 0;

  const SWIPE_MIN_PX = 48;

  const setSource = (img: HTMLImageElement, item: HTMLElement) => {
    const srcset = item.dataset.lightboxSrcset;
    if (srcset) {
      img.sizes = '100vw';
      img.srcset = srcset;
    } else {
      img.removeAttribute('sizes');
      img.removeAttribute('srcset');
    }
    img.src = item.dataset.lightboxSrc ?? '';
  };

  /** Warms the browser cache for a neighbour so navigating feels instant. */
  const preload = (position: number) => {
    if (items.length < 2) return;
    setSource(new Image(), items[(position + items.length) % items.length]);
  };

  const show = (position: number) => {
    index = (position + items.length) % items.length;
    const item = items[index];
    setSource(image, item);
    image.alt = item.dataset.lightboxAlt ?? '';
    text.textContent = [item.dataset.lightboxCaption ?? '', item.dataset.lightboxCredit ?? ''].filter(Boolean).join(' — ');
    count.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : '';
    const several = items.length > 1;
    prev.hidden = !several;
    next.hidden = !several;
    preload(index + 1);
    preload(index - 1);
  };

  document.addEventListener('click', (event) => {
    const trigger = (event.target as Element | null)?.closest<HTMLElement>('[data-lightbox]');
    if (!trigger) return;
    event.preventDefault();
    const group = trigger.dataset.lightboxGroup ?? '';
    items = [...document.querySelectorAll<HTMLElement>('[data-lightbox]')].filter((el) => (el.dataset.lightboxGroup ?? '') === group);
    show(items.indexOf(trigger));
    dialog.showModal();
    root.classList.add('has-open-lightbox');
  });

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', () => dialog.close());

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close();
    }
  });

  // A click outside the photo (and not on a control) closes the viewer.
  dialog.addEventListener('click', (event) => {
    const figure = dialog.querySelector('.lightbox-figure');
    const target = event.target as Element | null;
    if (figure && !figure.contains(target) && !target?.closest('button')) dialog.close();
  });

  let touchX = 0;
  let touchY = 0;
  dialog.addEventListener(
    'touchstart',
    (event) => {
      touchX = event.changedTouches[0].clientX;
      touchY = event.changedTouches[0].clientY;
    },
    { passive: true },
  );
  dialog.addEventListener(
    'touchend',
    (event) => {
      const dx = event.changedTouches[0].clientX - touchX;
      const dy = event.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
      show(index + (dx < 0 ? 1 : -1));
    },
    { passive: true },
  );

  dialog.addEventListener('close', () => {
    image.removeAttribute('src');
    image.removeAttribute('srcset');
    root.classList.remove('has-open-lightbox');
  });
}
